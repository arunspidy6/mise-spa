// Stable per-install identifier, used to attribute API/credit usage to a device
// (there are no accounts). Generated once, persisted in localStorage — survives
// reloads and app restarts. Not PII on its own; pair with a privacy-policy note.

let cached: string | null = null;

export function getDeviceId(): string {
  if (cached) return cached;
  try {
    let id = localStorage.getItem("mise-device-id");
    if (!id) {
      id = (crypto?.randomUUID?.() ?? `d_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      localStorage.setItem("mise-device-id", id);
    }
    cached = id;
    return id;
  } catch {
    return "anon";
  }
}
