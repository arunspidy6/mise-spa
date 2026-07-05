// Product analytics via PostHog — for active users, retention and per-device
// usage. No-ops entirely unless VITE_POSTHOG_KEY is set, so dev/preview builds
// without keys are unaffected. The device id (stable per install) is the
// distinct_id, so retention cohorts line up with the server-side MISE_USAGE
// cost logs keyed on the same id.

import { getDeviceId } from "./device";

let ready = false;
let ph: any = null;

export async function initAnalytics(): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";
  if (!key || ready) return;
  try {
    const mod: any = await import("posthog-js");
    ph = mod.default ?? mod.posthog ?? mod;
    ph.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true,
      autocapture: true,
      // Identify as the device from the very first event.
      bootstrap: { distinctID: getDeviceId() },
    });
    ph.identify(getDeviceId());
    ready = true;
  } catch {
    /* analytics must never break the app */
  }
}

export function track(event: string, props?: Record<string, unknown>): void {
  try { if (ready && ph) ph.capture(event, props); } catch { /* ignore */ }
}
