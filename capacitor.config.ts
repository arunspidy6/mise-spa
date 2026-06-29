import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wraps the built web app (dist/) in a native iOS shell.
// Run `npm run build` first, then `npx cap sync ios`, then `npx cap open ios`.
const config: CapacitorConfig = {
  appId: "app.mise.cook",          // reverse-DNS bundle id — set to your own
  appName: "Mise",
  webDir: "dist",
  ios: {
    // Use the modern WKWebView scheme. The API CORS allowlist must include
    // capacitor://localhost (see api/*.ts).
    scheme: "Mise",
    contentInset: "always",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#E8732C",
    },
  },
};

export default config;
