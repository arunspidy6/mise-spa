import type { VercelRequest } from "@vercel/node";

// Request gate for the paid AI endpoints.
//
// Layer 1 (implemented here): a shared app token. When APP_ATTEST_SECRET is set
// in the Vercel environment, requests must present a matching `x-app-attest`
// header; unauthenticated callers get 401. When it's unset the gate is OPEN
// (fail-open) so the live app never breaks before you configure it.
//
// Layer 2 (the strong one — see docs/production.md): Firebase App Check /
// Apple App Attest. verifyAppCheck() below is the hook to add that; today it's a
// no-op passthrough so the code path is ready without pulling heavy deps.
//
// The shared token stops casual abuse (random curl → 401). It is NOT
// cryptographic attestation — a determined attacker can extract a client-side
// token — so pair it with the Anthropic spend cap + rate limits, and move to
// App Check for a hardened launch.

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function appRequestAllowed(req: VercelRequest): boolean {
  const secret = process.env.APP_ATTEST_SECRET;
  if (!secret) return true; // not configured — don't break the app
  const token = (req.headers["x-app-attest"] as string | undefined) ?? "";
  return timingSafeEqual(token, secret);
}

// Placeholder for the App Check / App Attest verification layer. Returns true
// until wired (see docs). Kept async so the real implementation (token verify)
// slots in without changing call sites.
export async function verifyAppCheck(_req: VercelRequest): Promise<boolean> {
  return true;
}
