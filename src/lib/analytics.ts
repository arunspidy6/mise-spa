// Product analytics via PostHog — for active users, retention and per-device
// usage. No-ops entirely unless VITE_POSTHOG_KEY is set, so dev/preview builds
// without keys are unaffected. The device id (stable per install) is the
// distinct_id, so retention cohorts line up with the server-side MISE_USAGE
// cost logs keyed on the same id.

import { getDeviceId } from "./device";

let ready = false;
let ph: any = null;

// Super-properties merged onto every captured event. Registered before init
// (e.g. the A/B variant) and applied once PostHog is ready, so no event is
// left untagged. Also mirrored to person properties for cohort breakdowns.
const superProps: Record<string, unknown> = {};

// Tag all events (and the person) with a property — used for the app_variant
// A/B split so any metric can be broken down by version in PostHog. Safe to
// call before initAnalytics(); the value is applied when PostHog comes up.
export function registerSuperProps(props: Record<string, unknown>): void {
  Object.assign(superProps, props);
  try {
    if (ready && ph) {
      ph.register(props);
      ph.setPersonProperties?.(props);
    }
  } catch { /* ignore */ }
}

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
    // Tag every event with the stable device id explicitly (in addition to it
    // being the distinct_id), so funnels can be grouped on it without relying on
    // distinct_id resolution.
    ph.register({ device_id: getDeviceId() });
    // Apply any super-properties registered before init (e.g. app_variant) so
    // they tag the very first pageview too.
    if (Object.keys(superProps).length) {
      ph.register(superProps);
      ph.setPersonProperties?.(superProps);
    }
    ready = true;
  } catch {
    /* analytics must never break the app */
  }
}

export function track(event: string, props?: Record<string, unknown>): void {
  try { if (ready && ph) ph.capture(event, props); } catch { /* ignore */ }
}
