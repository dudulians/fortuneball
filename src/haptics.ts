import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import CoreHaptics from "./coreHaptics";

/**
 * Two backends:
 *   - Core Haptics (our own plugin) on iPhones that have it — precise pulses whose
 *     strength follows the shake;
 *   - @capacitor/haptics everywhere else (and on iOS if the plugin is missing).
 * Which one is decided once, by asking the plugin whether it exists.
 */

type Cleanup = () => void;
type Backend = "core" | "impact";

let backend: Backend = "impact";

if (Capacitor.getPlatform() === "ios") {
  CoreHaptics.isAvailable()
    .then((r) => {
      if (r.available) backend = "core";
    })
    .catch(() => {
      // plugin not registered in this build — stay on @capacitor/haptics
    });
}

async function safe(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch {
    // Not on a device — ignore.
  }
}

function knock(intensity: number, sharpness: number, style: ImpactStyle): void {
  if (backend === "core") void safe(() => CoreHaptics.knock({ intensity, sharpness }));
  else void safe(() => Haptics.impact({ style }));
}

/** Rapid light taps for as long as the ball is rattling (a tap on the ball). Returns a stop function. */
export function startRattleHaptics(enabled: boolean, intervalMs = 90): Cleanup {
  if (!enabled) return () => {};
  let alive = true;
  const tick = () => {
    if (!alive) return;
    knock(0.35 + Math.random() * 0.2, 0.6, ImpactStyle.Light);
    // Slight jitter so it feels like a die knocking around, not a metronome.
    setTimeout(tick, intervalMs + Math.random() * 60);
  };
  tick();
  return () => {
    alive = false;
  };
}

let lastJoltAt = 0;

/**
 * One knock of the die against the wall — fired for every jolt of a real shake,
 * so the vibration follows the hand: harder shake, harder knock; stop moving, silence.
 * magnitude is the acceleration in m/s² (threshold ≈ 16, a hard shake ≈ 30+).
 */
export function joltHaptic(enabled: boolean, magnitude: number): void {
  if (!enabled) return;
  const now = performance.now();
  if (now - lastJoltAt < 70) return; // the Taptic Engine can't resolve faster than this
  lastJoltAt = now;
  const strength = Math.min(1, Math.max(0.3, (magnitude - 10) / 22));
  const style = magnitude < 20 ? ImpactStyle.Light : magnitude < 28 ? ImpactStyle.Medium : ImpactStyle.Heavy;
  knock(strength, 0.55, style);
}

/** The die reaches the glass. */
export async function revealHaptic(enabled: boolean): Promise<void> {
  if (!enabled) return;
  if (backend === "core") {
    await safe(() => CoreHaptics.reveal());
    return;
  }
  await safe(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  setTimeout(() => void safe(() => Haptics.notification({ type: NotificationType.Success })), 120);
}

export async function tapHaptic(enabled: boolean): Promise<void> {
  if (!enabled) return;
  if (backend === "core") {
    await safe(() => CoreHaptics.knock({ intensity: 0.7, sharpness: 0.5 }));
    return;
  }
  await safe(() => Haptics.impact({ style: ImpactStyle.Medium }));
}
