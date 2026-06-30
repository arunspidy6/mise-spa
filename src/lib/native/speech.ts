// Native speech recognition for cook mode.
//
// iOS WKWebView has no Web Speech API, so on native we use the Capacitor
// community speech-recognition plugin (Apple's Speech framework). The web path
// stays on webkitSpeechRecognition (handled in cook.tsx). This module owns the
// native listen loop so cook.tsx just calls start/stop.

import { Capacitor } from "@capacitor/core";

export function nativeVoiceSupported(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

async function plugin() {
  const mod = await import("@capacitor-community/speech-recognition");
  return mod.SpeechRecognition;
}

let active = false;

// Start continuous-ish recognition: the plugin returns a result after each
// utterance, so we re-arm it while `active` to keep listening. Partials and
// finals are both forwarded to `onText`.
export async function startNativeSpeech(
  onText: (text: string, isFinal: boolean) => void,
): Promise<boolean> {
  if (!nativeVoiceSupported()) return false;
  try {
    const SR = await plugin();
    const perm = await SR.requestPermissions();
    if ((perm as any).speechRecognition !== "granted") return false;

    active = true;
    await SR.removeAllListeners();
    await SR.addListener("partialResults", (data: any) => {
      const m = data?.matches?.[0];
      if (m) onText(m, false);
    });

    const loop = async () => {
      if (!active) return;
      try {
        const res: any = await SR.start({ language: "en-US", partialResults: true, popup: false, maxResults: 1 });
        const m = res?.matches?.[0];
        if (m) onText(m, true);
      } catch { /* no-speech / aborted — just re-arm */ }
      if (active) setTimeout(loop, 200);
    };
    loop();
    return true;
  } catch {
    return false;
  }
}

export async function stopNativeSpeech(): Promise<void> {
  active = false;
  if (!nativeVoiceSupported()) return;
  try {
    const SR = await plugin();
    await SR.stop();
    await SR.removeAllListeners();
  } catch { /* ignore */ }
}
