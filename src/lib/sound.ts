// Small Web Audio chimes for key app moments. Best-effort: silently no-ops if
// audio can't start. A single shared context is unlocked on a user gesture
// (primeAudio) so iOS still lets us play the chime when the async recipe
// finishes — a fresh context created off-gesture would stay suspended on iOS.

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

// A gentle rising three-note chime played when a fresh recipe is ready.
export function playRecipeReady() {
  const c = getCtx();
  if (c) {
    try {
      const note = (t: number, freq: number, dur: number, vol = 0.2) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "sine";
        o.connect(g);
        g.connect(c.destination);
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.start(t);
        o.stop(t + dur + 0.05);
      };
      const t0 = c.currentTime;
      note(t0, 587.33, 0.16);        // D5
      note(t0 + 0.11, 783.99, 0.16); // G5
      note(t0 + 0.22, 1046.5, 0.5);  // C6
    } catch {
      /* ignore */
    }
  }
  navigator.vibrate?.(40);
}
