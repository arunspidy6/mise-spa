// Small Web Audio chimes for key app moments. Best-effort: silently no-ops if
// audio can't start. A single shared context is unlocked on a user gesture
// (primeAudio) so iOS still lets us play the chime when the async recipe
// finishes — a fresh context created off-gesture would stay suspended on iOS.

import { hapticSuccess } from "./haptics";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

// Call synchronously inside a user gesture (e.g. the "Find me something" tap).
export function primeAudio() {
  getCtx();
}

// An achievement-style fanfare when a fresh recipe is ready: a bright ascending
// arpeggio that lands on a held C-major chord — that "level up / unlocked" feel.
export function playRecipeReady() {
  const c = getCtx();
  if (c) {
    try {
      const note = (t: number, freq: number, dur: number, vol = 0.18, type: OscillatorType = "triangle") => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.connect(g);
        g.connect(c.destination);
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.start(t);
        o.stop(t + dur + 0.05);
      };
      const t0 = c.currentTime;
      // Quick ascending run…
      note(t0 + 0.00, 523.25, 0.13);   // C5
      note(t0 + 0.10, 659.25, 0.13);   // E5
      note(t0 + 0.20, 783.99, 0.13);   // G5
      // …landing on a bright, held C-major chord (root + third + fifth).
      note(t0 + 0.32, 1046.5, 0.6, 0.2);   // C6
      note(t0 + 0.32, 1318.51, 0.6, 0.11); // E6
      note(t0 + 0.32, 1567.98, 0.6, 0.09); // G6
    } catch {
      /* ignore */
    }
  }
  hapticSuccess();
}
