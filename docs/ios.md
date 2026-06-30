# Shipping Mise as an iOS app (Capacitor)

Mise is a React + Vite web app. Capacitor wraps the built web app in a native
iOS shell (WKWebView) so we reuse ~90% of the code. The only genuine
re-implementations are **notifications** and **voice**, because both rely on
web-only APIs.

This branch scaffolds the setup. The native iOS project itself (`ios/`) is
generated on a Mac with Xcode — see step 2.

---

## Prerequisites
- **Apple Developer Program** membership ($99/year).
- A **Mac with Xcode** (or a cloud builder like EAS Build / Codemagic if you
  have no Mac). CocoaPods is required (`sudo gem install cocoapods`).
- Set your real bundle id in `capacitor.config.ts` (`appId`, currently
  `app.mise.cook`).

## 1. What's already wired (this branch)
- `@capacitor/core`, `/cli`, `/ios`, `/local-notifications`, `/preferences`.
- `capacitor.config.ts` — `webDir: dist`, iOS scheme, notification icon/colour.
- `src/lib/native/notify.ts` — unified notification layer (native Local
  Notifications on iOS, Notification API on web). Adopt this for cook timers and
  meal reminders so the port is a config change, not a rewrite.
- API CORS allowlists now include `capacitor://localhost` (see `api/*.ts`).
- npm scripts: `ios:add`, `ios:sync`, `ios:open`.

## 2. Generate the native project (on a Mac)
```bash
npm install
npm run build
npm run ios:add      # npx cap add ios  → creates ios/
npm run ios:sync     # build + npx cap sync ios
npm run ios:open     # opens Xcode
```
Then in Xcode: set the Team (signing), bundle id, and run on a simulator/device.

## 3. The re-implementations (web APIs that don't exist on iOS WebView)
### Notifications (highest priority)
- The web Service Worker (`public/sw.js`) timers/reminders do **not** run in a
  WKWebView. Route all scheduling through `src/lib/native/notify.ts`, which uses
  Capacitor **Local Notifications** on iOS (OS-scheduled, fire when the app is
  closed). This also fixes the "durable reminders" gap flagged in review.
- Add to `ios/App/App/Info.plist`: the system shows the permission prompt on
  first `ensureNotificationPermission()`.
- Handle taps → deep link: listen to `LocalNotifications.addListener(
  'localNotificationActionPerformed', …)` and navigate to `extra.url`.

### Voice (cook mode)
- `webkitSpeechRecognition` is unavailable in iOS WebView. Options:
  (a) hide voice on `isNative()`, or
  (b) add a native Speech plugin (Capacitor community speech-recognition) and
      gate the existing UI behind it.
- Info.plist usage strings: `NSMicrophoneUsageDescription`,
  `NSSpeechRecognitionUsageDescription`.

### Persistence
- `localStorage` works in WebView but iOS can evict it. Migrate the zustand
  persist storage to `@capacitor/preferences` (or SQLite) for durability.

### Polish
- `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/haptics`,
  and safe-area insets (already partly handled via `pb-safe`/MobileFrame).

## 4. App Store submission
- App icon (1024px + sizes), launch screen, per-device screenshots.
- **Privacy Policy URL** (required) + App Privacy "nutrition label": disclose
  that ingredients are sent to our server → Anthropic for recipe generation.
- Info.plist usage strings (notifications/mic/speech).
- Keep the **AI-content disclaimer** visible (already shown on the recipe card).
- Age-rating questionnaire → **TestFlight** beta → submit for review.

## Notes
- The Vercel backend is unchanged; the app calls it over HTTPS. The Anthropic
  key stays server-side — never ship it in the app bundle.
- `ios/` is intentionally **not** committed here; generate it per step 2.
