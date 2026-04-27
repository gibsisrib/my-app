require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: '8mb' }));

const {
  parseJsonFromAiContent,
  normalizeAiPayload,
  applyAtwaterReconciliation,
} = require('./lib/nutritionNormalize');

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const ipBuckets = new Map();

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function rateLimit(req, res, next) {
  const key = getClientIp(req);
  const now = Date.now();
  const bucket = ipBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a minute and try again.',
    });
  }

  bucket.count += 1;
  return next();
}

function sanitizeBase64(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();
}

const MEAL_ANALYSIS_JSON_INSTRUCTION = `Return ONLY a single JSON object (no markdown, no code fences) with this shape:
{
  "type": "meal" or "drink",
  "name": "Optional short headline for the whole plate (you may omit or leave empty)",
  "items": [
    {
      "food": "Short label, e.g. Grilled chicken breast",
      "portion": "Be specific: counts, visible size, e.g. '2 pieces visible, ~6 oz each' or '~1 cup cooked rice'",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0
    }
  ]
}

Rules for "items":
- Include EVERY separate food or drink you can identify in the image or description: protein, starch, vegetables, bread, cheese, sauces, oil, butter, condiments, beverages in frame, etc.
- If you see multiple identical pieces (two chicken breasts, three slices of toast), put that in "portion" and scale that row's calories and macros for ALL of them — do not default to a single serving.
- If the whole photo is only one food repeated (e.g. two similar chicken breasts, no rice or vegetables), use ONE "items" row whose "portion" states the exact count (e.g. "2 boneless breasts visible, ~6 oz each") and whose macros are for BOTH pieces combined — never imply a single piece in the name while doubling protein.
- Visible pooled oil or butter on the plate: either include fat in the meat row and mention oil in "portion", or add a second tiny row for "Pan juices / oil" so fats are not wildly under-counted.
- Each row's calories and macros are for THAT component only. Use whole numbers ≥ 0.

Macro sanity (avoid impossible numbers):
- Cooked lean chicken or turkey is roughly ~25–35 g protein per 100 g of meat. One typical single boneless breast is often ~35–50 g protein from the meat alone; two medium breasts together are often roughly ~70–95 g protein total (depends on size — not ~120 g unless they are clearly very large portions).
- Totals across the plate should match the visible volume; when unsure, prefer slightly conservative estimates.

Atwater consistency (critical for logging accuracy):
- For the entire meal, total calories should be within ~20% of (4×total protein_g + 4×total carbs_g + 9×total fats_g) using the summed numbers you return. If any "items" row has calories that clearly disagree with that row's own macros, fix the row before returning.
- The meal's total nutrition is the sum of all "items" rows (they must be internally consistent).`;

async function analyzeMealOpenAI({ imageBase64, description }, apiKey) {
  let textPrompt;
  if (imageBase64 && description) {
    textPrompt = `You are an expert nutritionist helping log a meal from a photo plus the user's notes.

Photo: use the entire frame — scan for every distinct food and drink, counts of identical items, sides, sauces, and oils.

User notes (apply as adjustments on top of what you see — extra toppings add calories; removals reduce them):
"""${description}"""

${MEAL_ANALYSIS_JSON_INSTRUCTION}`;
  } else if (imageBase64) {
    textPrompt = `You are an expert nutritionist. The user is logging a meal from ONE photo.

Scan the ENTIRE image (edges of the plate, background items that are clearly part of the meal). List every distinct food or drink. Count visible identical pieces (e.g. if two chicken breasts are shown, two go in portion and macros — not one "typical" breast). Include sides, rice, bread, salad, sauces, butter, and drinks in the shot.

${MEAL_ANALYSIS_JSON_INSTRUCTION}`;
  } else {
    textPrompt = `You are an expert nutritionist. There is no photo — only this description of what they ate:
"""${description}"""

Infer reasonable components and portions from their words. If they imply multiple items or servings, reflect that across separate "items" rows.

${MEAL_ANALYSIS_JSON_INSTRUCTION}`;
  }

  const userContent = imageBase64
    ? [
        { type: 'text', text: textPrompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
          },
        },
      ]
    : textPrompt;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty response.');
  return normalizeAiPayload(parseJsonFromAiContent(content));
}

async function analyzeMealGemini({ imageBase64, description }, apiKey) {
  let prompt;
  if (imageBase64 && description) {
    prompt = `You are an expert nutritionist helping log a meal from a photo plus the user's notes.

Photo: use the entire frame — every distinct food and drink, counts of identical items, sides, sauces, oils.

User notes (apply on top of what you see):
"""${description}"""

${MEAL_ANALYSIS_JSON_INSTRUCTION}`;
  } else if (imageBase64) {
    prompt = `You are an expert nutritionist. The user is logging a meal from ONE photo.

Scan the ENTIRE image. List every distinct food or drink; count visible identical pieces (e.g. two chicken breasts → portion and macros for two, not one default serving). Include sides, sauces, butter, bread, and drinks in the shot.

${MEAL_ANALYSIS_JSON_INSTRUCTION}`;
  } else {
    prompt = `You are an expert nutritionist. There is no photo — only this meal description:
"""${description}"""

Infer components and portions; use multiple "items" rows if they describe several foods or multiple servings.

${MEAL_ANALYSIS_JSON_INSTRUCTION}`;
  }

  const parts = [{ text: prompt }];
  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: imageBase64,
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response.');
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return normalizeAiPayload(parseJsonFromAiContent(jsonStr));
}

async function runAnalyzeMeal({ imageBase64, description }) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openaiKey && !geminiKey) {
    throw new Error('Server AI keys are not configured.');
  }

  const raw = openaiKey
    ? await analyzeMealOpenAI({ imageBase64, description }, openaiKey)
    : await analyzeMealGemini({ imageBase64, description }, geminiKey);

  return applyAtwaterReconciliation(raw);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/analyze-meal', rateLimit, async (req, res) => {
  try {
    const imageBase64 = sanitizeBase64(req.body?.imageBase64);
    const description =
      typeof req.body?.description === 'string' ? req.body.description.trim() : '';

    if (!imageBase64 && !description) {
      return res.status(400).json({
        error: 'Add a short description and/or a photo.',
      });
    }

    const payload = await runAnalyzeMeal({ imageBase64, description });
    return res.json(payload);
  } catch (error) {
    console.error('AI meal analyze failed:', error);
    return res.status(500).json({
      error: 'Failed to estimate meal. Please try again.',
      detail: String(error?.message || error).slice(0, 240),
    });
  }
});
app.get("/", (req, res) => {
  res.send("Server is alive");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});
app.post('/analyze-food-photo', rateLimit, async (req, res) => {
  try {
    const imageBase64 = sanitizeBase64(req.body?.imageBase64);
    const description =
      typeof req.body?.description === 'string' ? req.body.description.trim() : '';

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload.' });
    }

    const payload = await runAnalyzeMeal({ imageBase64, description });
    return res.json(payload);
  } catch (error) {
    console.error('AI analyze failed:', error);
    return res.status(500).json({
      error: 'Failed to analyze photo. Please try again.',
      detail: String(error?.message || error).slice(0, 240),
    });
  }
});

app.listen(Number(PORT) || 8787, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT} (health + meal AI)`);
});
