import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wraps the built web app (dist/) in a native iOS shell.
// Run `npm run build` first, then `npx cap sync ios`, then `npx cap open ios`.
const config: CapacitorConfig = {
  appId: "app.mise.cook",          // reverse-DNS bundle id — set to your own
  appName: "Mise",
  webDir: "dist",
  ios: {
    // Keep the DEFAULT scheme so the webview origin is the well-known
    // capacitor://localhost (which the API CORS allowlist targets). A custom
    // scheme would change the Origin header and break CORS.
    // Let the webview fill the whole screen; safe areas are handled in CSS via
    // env(safe-area-inset-*) on the app frame. ("always" insets the scroll view
    // but the fixed-position frame ignores it, causing a status-bar clash up top
    // and a gap at the bottom.)
    contentInset: "never",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#E8732C",
    },
  },
};

export default config;
