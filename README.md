# Baby Girl Tracker

Expo (React Native) calorie and hydration tracker with a small Node server (`/health`, **`POST /analyze-meal`** for meal AI). Deploy the same `server/index.js` to Railway; keep **`OPENAI_API_KEY`** (and optionally **`GEMINI_API_KEY`**) only on the server.

## What you need to run it

1. **Node** (LTS) and **npm**
2. **Expo Go** or a simulator, for the app
3. **Environment files** (never commit real `.env` files)

### App (Expo)

Copy `.env.example` to `.env`. Set **`EXPO_PUBLIC_API_BASE_URL`** to your API (`http://localhost:8787` locally, or your Railway HTTPS URL in production builds via **EAS Secrets**). See `utils/getApiBaseUrl.ts` for how `localhost` is rewritten on a physical device in development.

### Server (`server/index.js`)

From the repo root, `npm run server` loads **`dotenv` from the project root**. Put **`OPENAI_API_KEY`** (and optionally **`GEMINI_API_KEY`**) in that root `.env` for local meal AI, or set them on **Railway** only in production. See `server/.env.example`.

### Railway (meal API)

Railway runs **`npm start`** for Node services. This repo’s **`npm start`** is **`node server/index.js`** (the meal API), not Expo — so **`/health`** works. **`railway.toml`** and **`nixpacks.toml`** also set the same start command as a backup. If you still see **502**, open **Deploy Logs** in Railway (crash on boot, wrong root directory, or missing `OPENAI_API_KEY` only affects `/analyze-meal`, not `/health`). Use the **exact** HTTPS hostname from the Railway service tab in **`EXPO_PUBLIC_API_BASE_URL`** (your URL may look like `…55d1…` or `…56d1…` — they must match). Redeploy after pulling latest `main`.

## Commands

```bash
npm install
# If npm reports a peer dependency conflict (svg-charts vs svg), use:
# npm install --legacy-peer-deps
npm run server    # API (default 8787); same entry as `npm start` (what Railway runs)
npm run start:expo   # Expo dev server — use this for the mobile app locally
npm test          # unit tests (day totals / diary aggregation)
npm run test:server  # server/lib unit tests (normalization helpers, label energy parsing)
npm run test:all     # both test suites
```

Or both together:

```bash
npm run dev
```

## Product flow

- Data is stored locally with **AsyncStorage** (`CaloriesContext.js`): meals, water, weights, profile, favorites.
- Per-day calories and macros are computed in **`utils/diaryAggregates.ts`** (used by the context and the progress screen so totals stay consistent).
- First launch: `app/index.tsx` sends users to onboarding or tabs based on `profileCompleted`.
- Tabs are only shown after onboarding; if someone lands on tabs without a profile, `app/(tabs)/_layout.tsx` redirects to onboarding.

## Scripts (from `package.json`)

| Script    | Purpose                          |
| --------- | -------------------------------- |
| `start`   | Expo dev server                  |
| `server`  | Node API                         |
| `dev`     | API + Expo via `concurrently`   |
| `lint`    | `expo lint`                      |
| `test`    | `tsx` + Node test runner (`utils/diaryAggregates.test.ts`) |
| `test:server` | Node tests for `server/lib` (normalization + label energy parsing) |
| `test:all` | Runs `test` and `test:server` |
| `prepare:screenshots` | Resize `app-store-raw/*` → `app-store-out/` for App Store Connect |

## App Store screenshots (resize locally)

Nothing in the repo can log into your browser or App Store Connect; generate files locally, then upload them. To match **iPhone 6.9"** sizes (e.g. **1290 × 2796**):

1. Copy your PNG/JPEG screenshots into **`app-store-raw/`** in this repo (crop off Android nav bars first if you want a cleaner look).
2. Run: **`npm install`** (needs **`sharp`**), then **`npm run prepare:screenshots`**.
3. Upload the files from **`app-store-out/`** using **Choose File** in Media Manager.

Optional: **`npm run prepare:screenshots -- --sizes=69-all`** also writes the other 6.9" portrait sizes Apple lists.

## Calorie accuracy (what to expect)

- **Manual entry** is as accurate as the numbers you type.
- **Barcode / Open Food Facts** (when wired to a backend) depends on the database row; the `server/lib` tests cover **kilojoules → kcal** and **ml servings** helpers used for consistent energy math.
- **AI meal analysis** sends photo and/or description to **`POST /analyze-meal`** on your server; the server calls OpenAI (or Gemini if OpenAI is unset) and reconciles calories with macros before returning.

## Learn more

- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)
