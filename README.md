# Baby Girl Tracker

Expo (React Native) calorie and hydration tracker with a small Node server for food search (Open Food Facts) and optional AI meal estimation.

## What you need to run it

1. **Node** (LTS) and **npm**
2. **Expo Go** or a simulator, for the app
3. **Environment files** (never commit real `.env` files)

### App (Expo)

Copy `.env.example` to `.env` in the project root and set:

- `EXPO_PUBLIC_API_BASE_URL` — URL of your machine running the API, e.g. `http://localhost:8787` on web/emulator, or `http://<your-LAN-IP>:8787` when testing on a physical phone (Expo replaces `localhost` with the dev host when possible; see `utils/getApiBaseUrl.ts`).

Food search and AI features need this base URL pointing at a running server.

### Server (`server/index.js`)

From the repo root, `npm run server` loads `dotenv` from the **current working directory** (the project root). Put server secrets in root `.env` **only if** you do not reference them in client code — this project only reads `OPENAI_API_KEY` / `GEMINI_API_KEY` inside `server/index.js`.

Alternatively, run the server from `server/` with a `server/.env` file (see `server/.env.example`) and merge your workflow as you prefer.

Required for AI routes: at least one of `OPENAI_API_KEY` or `GEMINI_API_KEY`. Food search does not need a product API key.

## Commands

```bash
npm install
# If npm reports a peer dependency conflict (svg-charts vs svg), use:
# npm install --legacy-peer-deps
npm run server    # API on PORT (default 8787)
npx expo start    # app
npm test          # unit tests (day totals / diary aggregation)
npm run test:server  # server: AI JSON normalization, Atwater fix-up, Open Food Facts kJ/ml helpers
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
| `test:server` | Node tests for `server/lib` (meal AI normalization + label energy parsing) |
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
- **Barcode / Open Food Facts** depends on the database row; the server now understands **kilojoules → kcal** and **ml servings** (treated like grams for scaling) so fewer products return `0` or wrong energy by mistake.
- **AI photo / description** is still an **estimate** (portion guesswork). After the model responds, the server **reconciles** totals: if declared calories drift too far from classic **4·P + 4·C + 9·F** macros, calories are adjusted to match the macros so your log stays internally consistent. That does not make guesses perfect—it reduces one common class of “wild number” bugs.

## Learn more

- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)
