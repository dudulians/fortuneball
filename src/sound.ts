// Procedural sound via Web Audio. No files.
// Design goal: quiet, physical, no "UI beeps". A die inside a liquid-filled
// glass sphere: muffled knocks while shaking, one soft water "bloop" when
// the die reaches the window. Nothing else.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a tap handler on iOS to unlock audio. */
export function unlockAudio(): void {
  const context = getCtx();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
}

/**
 * One knock: a small, damped resonant body (modal synthesis — a few decaying
 * partials at inharmonic ratios) behind a low-pass, plus a 3 ms transient.
 * Muffled on purpose: the die is inside liquid.
 */
function knock(context: AudioContext, at: number, gain: number, master: AudioNode) {
  const f0 = 170 + Math.random() * 90;
  const partials = [
    { ratio: 1.0, decay: 0.09, amp: 1.0 },
    { ratio: 2.32, decay: 0.05, amp: 0.35 },
    { ratio: 3.87, decay: 0.03, amp: 0.15 },
  ];

  const lp = context.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900 + Math.random() * 500;
  lp.Q.value = 0.7;
  lp.connect(master);

  for (const p of partials) {
    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0 * p.ratio, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain * p.amp, at + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, at + p.decay);
    osc.connect(g);
    g.connect(lp);
    osc.start(at);
    osc.stop(at + p.decay + 0.02);
  }

  // Transient: 3 ms of noise gives the "contact".
  const len = Math.floor(context.sampleRate * 0.003);
  const buf = context.createBuffer(1, len, context.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = context.createBufferSource();
  src.buffer = buf;
  const tg = context.createGain();
  tg.gain.value = gain * 0.5;
  src.connect(tg);
  tg.connect(lp);
  src.start(at);
}

/** One knock right now, for a real jolt of the phone. `intensity` 0..1. */
export function playKnockSound(enabled: boolean, intensity: number): void {
  if (!enabled) return;
  const context = getCtx();
  if (!context) return;
  const master = context.createGain();
  master.gain.value = 0.5;
  master.connect(context.destination);
  knock(context, context.currentTime, 0.35 + 0.5 * Math.min(1, Math.max(0, intensity)), master);
}

/**
 * Shake (tap-driven, no sensor): irregular knocks, denser at the start, thinning out as it settles.
 */
export function playShakeSound(enabled: boolean, durationMs: number): void {
  if (!enabled) return;
  const context = getCtx();
  if (!context) return;

  const now = context.currentTime;
  const duration = durationMs / 1000;
  const master = context.createGain();
  master.gain.value = 0.5;
  master.connect(context.destination);

  let t = 0.02;
  while (t < duration) {
    const progress = t / duration;
    const g = 0.6 * (1 - progress * 0.7) * (0.6 + Math.random() * 0.4);
    knock(context, now + t, g, master);
    t += 0.09 + progress * 0.2 + Math.random() * 0.07;
  }
}

/**
 * Bloop: a water drop — short sine whose pitch rises as the bubble closes.
 * Kept soft; it is a cue, not a fanfare.
 */
export function playBloopSound(enabled: boolean): void {
  if (!enabled) return;
  const context = getCtx();
  if (!context) return;

  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  const lp = context.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1800;

  osc.type = "sine";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(720, now + 0.11);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

  osc.connect(gain);
  gain.connect(lp);
  lp.connect(context.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

/** Kept for API compatibility: the reveal is silent by design. */
export function playRevealSound(_enabled: boolean): void {
  // intentionally empty
}
