# Mise — production system (scale, update, secure)

How Mise is built, shipped, and hardened for a public launch. Read alongside
`docs/ios.md` (the iOS build itself).

## Architecture
- **Web app** — React + Vite SPA (`src/`). Built to `dist/`.
- **Backend** — Vercel serverless functions (`api/*`) that call the Anthropic
  API. The Anthropic key lives only in Vercel env (`ANTHROPIC_API_KEY`), never
  in the app.
- **iOS app** — Capacitor wraps the web build in a native WKWebView (`ios/`).
  The app calls the same production backend over HTTPS.
- One backend serves the web app **and** every installed iOS version.

## Environments & deploy flow
| Surface | Source | How it ships |
|---|---|---|
| Backend (api) | `main` → Vercel **production** | Auto-deploys on merge — **instant, all users** (web + every installed app version). |
| Backend preview | any branch/PR | Vercel preview URL per branch. |
| Web UI | `main` → Vercel | Auto-deploys with the backend. |
| iOS UI (bundled) | a build cut from `main` | New build → TestFlight → App Review → users update. |
| iOS UI (OTA) | optional (Capgo) | Push a new web bundle at runtime — instant, no resubmission (JS/HTML/CSS only). |

**Rule:** merging publishes the backend immediately; the native app only changes
when you cut a build or push an OTA bundle.

## Release process
1. Feature branch → PR → merge to `main` (backend goes live).
2. **Native release:** bump version/build in Xcode → `npm run ios:sync` → Archive
   → upload to App Store Connect → TestFlight beta → submit for review.
3. **OTA (recommended for fast UI fixes):** integrate Capgo so JS/CSS changes
   ship without review. Native changes (plugins, permissions, Info.plist) always
   need a full build.
4. Tag releases; keep the version number aligned across git ↔ Xcode ↔ App Store.

## Security — DO BEFORE PUBLIC LAUNCH ⚠️
The AI endpoints are **public and cost money per call**. Today's protections:
- **CORS** — origin allowlist (`api/*`). Stops other *websites*, but a native
  app or `curl` can send any origin, so CORS is **not** a real boundary here.
- **Per-IP rate limit + global circuit breaker** (in `api/generate-recipe.ts`) —
  slows abuse but is bypassable (rotating IPs).
- **Anthropic monthly spend cap** — set a hard limit in the Anthropic Console
  (Settings → Limits). This is the only guaranteed stop on a runaway bill. Do
  this now.

### Layer 1 — shared app token (implemented; enable it)
The inline app gate in `api/generate-recipe.ts` and `api/classify-ingredient.ts` gates `generate-recipe` and `classify-ingredient`. It's
**fail-open until configured**, so nothing breaks until you turn it on:
1. Pick a long random string.
2. Vercel → project → Settings → Environment Variables: set `APP_ATTEST_SECRET`
   to it (Production). Redeploy.
3. Set `VITE_APP_ATTEST_SECRET` to the SAME value (Vercel env for the web build,
   and in the app build), then rebuild the app: `npm run ios:sync`.
Now unauthenticated callers get 401. This stops casual abuse (random `curl`),
but a client-embedded token can be extracted — so keep the spend cap + rate
limits, and add Layer 2 for a hardened launch.

### Layer 2 — App Attest (the strong one)
Verifies each request comes from a genuine, unmodified install of *your* app.
The practical path (no hand-rolled crypto) is **Firebase App Check with the App
Attest provider**:
- Create a Firebase project; register the iOS app; enable App Check → App Attest
  (and reCAPTCHA for the web).
- Client: `@capacitor-firebase/app-check` (native) / Firebase JS SDK (web) —
  fetch a token and send it as `X-Firebase-AppCheck`. Swap `appHeaders()` in
  `src/lib/appguard.ts` to return that token.
- Server: verify with the Firebase Admin SDK (`getAppCheck().verifyToken(token)`)
  inside the inline gate, and require it.
- Needs your Firebase project + a service account in Vercel env, and on-device
  testing (App Attest only works on real hardware).
- Never rely on a static bundle secret for real security — App Check is the
  cryptographic replacement.

## Scale & cost
- Serverless auto-scales; the real constraint is **Anthropic cost + latency**.
- Keep: prompt caching (already on the system prompt), rate limits, the spend cap.
- **Cache outputs**: store generated recipes/images so repeat views don't
  re-spend (pairs with the AI-image plan — generate once, persist the URL).
- Watch token usage in the Anthropic dashboard; alert on spikes.

## Backward compatibility (critical once live)
- Shipped app versions persist on users' phones; they all hit the **same**
  production API.
- **Never break the API request/response contract** an older build depends on.
  For a breaking change, add a versioned route (`/api/v2/...`) and keep the old
  one until those installs age out.

## Data & persistence
- Web/zustand persists to `localStorage`. iOS WebView can evict it — migrate the
  persisted store to `@capacitor/preferences` (or SQLite) for durability.
- No accounts today (all local). If accounts are added, App Store rules require
  in-app **account deletion**.

## Analytics & usage attribution
There are no accounts, so credit usage is attributed to a **device id** (stable
UUID in `localStorage`, sent as `X-Device-ID`). Every paid call logs one line:

```
MISE_USAGE {"evt":"generate","deviceId":"…","ip":"…","model":"claude-sonnet-4-6",
            "inTok":…, "outTok":…, "cacheRead":…, "cacheWrite":…, "costUsd":0.03,"ts":"…"}
```

- **Who's spending / cost per call:** grep `MISE_USAGE` in Vercel logs.
- **Retention:** Vercel logs are short-lived, so pipe events to a store:
  set `USAGE_SINK_URL` to a collector endpoint (each event POSTs there,
  fire-and-forget), or add a Vercel Log Drain. **PostHog** is the easiest for
  retention — use `deviceId` as the `distinct_id`; its retention/cohort charts
  then work out of the box. A Vercel Postgres table (`insert … from the sink`)
  is the alternative if you want SQL.
- The gate is now two-key: it only arms when **both** `APP_GATE_ENABLED=true`
  and `APP_ATTEST_SECRET` are set — setting the secret alone can no longer 401
  all traffic.

## Monitoring
- Error/crash reporting: Sentry (web + native) or TelemetryDeck.
- Vercel function logs + Anthropic usage dashboard.
- A health check on the API endpoints.

## Pre-launch checklist
- [ ] Anthropic monthly spend cap set.
- [ ] App Attest verification on the AI endpoints (web stays CORS + rate limit).
- [ ] Native notifications wired through `src/lib/native/notify.ts` (timers +
      meal reminders) — replaces the web Service Worker on iOS.
- [ ] Voice: native Speech plugin, or hide voice on `isNative()`.
- [ ] Persistence migrated to `@capacitor/preferences`.
- [ ] Info.plist usage strings (notifications, mic, speech).
- [ ] Privacy Policy URL + App Privacy labels (ingredients → server → Anthropic).
- [ ] OTA (Capgo) configured for fast UI fixes (optional but recommended).
- [ ] Error monitoring live.
- [ ] TestFlight beta pass.
