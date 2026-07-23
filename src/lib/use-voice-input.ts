// Continuous voice dictation for the dump composer. Web uses
// webkitSpeechRecognition; native iOS (WKWebView has no Web Speech API) uses the
// Capacitor speech plugin. Listening keeps going — re-armed on every end — until
// the caller stops it or mic access is denied, so a natural pause never cuts the
// user off. The callback gets (text, isFinal); callers act on finals.

import { useCallback, useEffect, useRef, useState } from "react";
import { nativeVoiceSupported, startNativeSpeech, stopNativeSpeech } from "./native/speech";

const SR = typeof window !== "undefined"
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

export const voiceInputSupported = !!SR || nativeVoiceSupported();

export function useVoiceInput(onResult: (text: string, isFinal: boolean) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const activeRef = useRef(false);
  const cbRef = useRef(onResult);
  useEffect(() => { cbRef.current = onResult; }, [onResult]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setListening(false);
    if (nativeVoiceSupported()) { stopNativeSpeech(); return; }
    if (recRef.current) { try { recRef.current.stop(); } catch { /* ignore */ } recRef.current = null; }
  }, []);

  // Web recognition — continuous, and re-armed on end so it never stops on its
  // own. Only a real stop() (user tap) or a permission error ends it.
  const startWeb = useCallback(() => {
    if (!SR || !activeRef.current) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const r = e.results[e.results.length - 1];
      if (r) cbRef.current((r[0]?.transcript ?? "").trim(), !!r.isFinal);
    };
    rec.onerror = (ev: any) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") stop();
      // no-speech / aborted / network — let onend re-arm.
    };
    rec.onend = () => {
      recRef.current = null;
      if (activeRef.current) setTimeout(() => startWeb(), 120);
      else setListening(false);
    };
    recRef.current = rec;
    try { rec.start(); } catch { setTimeout(() => startWeb(), 250); }
  }, [stop]);

  const start = useCallback(async () => {
    // Tapping again while listening stops it.
    if (activeRef.current) { stop(); return; }
    activeRef.current = true;
    setListening(true);

    // Native path (iOS app) — the plugin already loops per utterance.
    if (nativeVoiceSupported()) {
      const ok = await startNativeSpeech((text, isFinal) => cbRef.current(text, isFinal));
      if (!ok) { activeRef.current = false; setListening(false); }
      return;
    }

    if (!SR) { activeRef.current = false; setListening(false); return; }
    startWeb();
  }, [stop, startWeb]);

  // Stop on unmount so the mic never keeps running after leaving the screen.
  useEffect(() => () => { stop(); }, [stop]);

  return { listening, start, stop, supported: voiceInputSupported };
}
