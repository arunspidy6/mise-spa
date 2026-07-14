// Lightweight voice dictation for text inputs (the dump composer). Web uses
// webkitSpeechRecognition; native iOS (WKWebView has no Web Speech API) uses the
// Capacitor speech plugin. The callback receives the full spoken text so far, so
// the caller can drop it straight into a field. Best-effort — silently reports
// unsupported so the mic button can hide.

import { useCallback, useEffect, useRef, useState } from "react";
import { nativeVoiceSupported, startNativeSpeech, stopNativeSpeech } from "./native/speech";

const SR = typeof window !== "undefined"
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

export const voiceInputSupported = !!SR || nativeVoiceSupported();

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const activeRef = useRef(false);
  const onTextRef = useRef(onTranscript);
  useEffect(() => { onTextRef.current = onTranscript; }, [onTranscript]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setListening(false);
    if (nativeVoiceSupported()) { stopNativeSpeech(); return; }
    if (recRef.current) { try { recRef.current.stop(); } catch { /* ignore */ } recRef.current = null; }
  }, []);

  const start = useCallback(async () => {
    // Tapping again while listening stops it.
    if (activeRef.current) { stop(); return; }
    activeRef.current = true;
    setListening(true);

    // Native path (iOS app).
    if (nativeVoiceSupported()) {
      // Accumulate finals across utterances so a pause doesn't wipe earlier words.
      let finalSoFar = "";
      const ok = await startNativeSpeech((text, isFinal) => {
        onTextRef.current((finalSoFar + " " + text).trim());
        if (isFinal) finalSoFar = (finalSoFar + " " + text).trim();
      });
      if (!ok) { activeRef.current = false; setListening(false); }
      return;
    }

    // Web path.
    if (!SR) { activeRef.current = false; setListening(false); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      onTextRef.current(s.trim());
    };
    rec.onerror = () => { activeRef.current = false; setListening(false); recRef.current = null; };
    rec.onend = () => { activeRef.current = false; setListening(false); recRef.current = null; };
    recRef.current = rec;
    try { rec.start(); } catch { activeRef.current = false; setListening(false); }
  }, [stop]);

  // Stop on unmount so the mic never keeps running after leaving the screen.
  useEffect(() => () => { stop(); }, [stop]);

  return { listening, start, stop, supported: voiceInputSupported };
}
