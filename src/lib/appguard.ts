// Attaches the app token to API requests so the server gate accepts them.
//
// Set VITE_APP_ATTEST_SECRET at build time to the same value as the server's
// APP_ATTEST_SECRET env var. If unset, this is a no-op and requests go through
// unauthenticated (matching the server's fail-open default). Swap this for a
// Firebase App Check / App Attest token fetch when you enable that layer.

export function appHeaders(): Record<string, string> {
  const token = import.meta.env.VITE_APP_ATTEST_SECRET as string | undefined;
  return token ? { "X-App-Attest": token } : {};
}
