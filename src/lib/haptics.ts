// Haptic feedback. iOS Safari/WKWebView ignores navigator.vibrate, so on the
// native app we drive the real Taptic Engine via @capacitor/haptics; on web /
// Android we fall back to navigator.vibrate. All best-effort — never throws.

let mod: any;
async function load(): Promise<any> {
  if (mod !== undefined) return mod;
  try { mod = await import("@capacitor/haptics"); } catch { mod = null; }
  return mod;
}

function webVibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}

// A short "that didn't work" / error buzz — empty add, unrecognised item.
export function hapticWarn() {
  webVibrate(70);
  load().then(m => {
    try { m?.Haptics.notification({ type: m.NotificationType.Warning }); } catch { /* ignore */ }
  });
}

// A light tick — a successful, low-key action (item added).
export function hapticLight() {
  webVibrate(18);
  load().then(m => {
    try { m?.Haptics.impact({ style: m.ImpactStyle.Light }); } catch { /* ignore */ }
  });
}

// A celebratory success buzz — recipe ready.
export function hapticSuccess() {
  webVibrate([25, 40, 25]);
  load().then(m => {
    try { m?.Haptics.notification({ type: m.NotificationType.Success }); } catch { /* ignore */ }
  });
}
