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

**Required to truly secure the API:** request **attestation** so only genuine
installs of *your* app can call it.
- iOS: **App Attest / DeviceCheck** (`DCAppAttestService`). The app attests on
  first launch, sends the assertion with each request; the backend verifies it
  against Apple's keys and rejects anything else. Web keeps CORS + rate limit.
- Implement as a small `api/_guard.ts` checked at the top of each handler.
- Never embed a static secret in the app bundle — it's trivially extractable.

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
