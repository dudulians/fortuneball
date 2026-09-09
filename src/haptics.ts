import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

type Cleanup = () => void;

async function safe(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch {
    // Not on a device — ignore.
  }
}

/** Rapid light taps for as long as the ball is rattling. Returns a stop function. */
export function startRattleHaptics(enabled: boolean, intervalMs = 90): Cleanup {
  if (!enabled) return () => {};
  let alive = true;
  const tick = () => {
    if (!alive) return;
    void safe(() => Haptics.impact({ style: ImpactStyle.Light }));
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
 */
export function joltHaptic(enabled: boolean, magnitude: number): void {
  if (!enabled) return;
  const now = performance.now();
  if (now - lastJoltAt < 70) return; // the Taptic Engine can't resolve faster than this
  lastJoltAt = now;
  const style = magnitude < 20 ? ImpactStyle.Light : magnitude < 28 ? ImpactStyle.Medium : ImpactStyle.Heavy;
  void safe(() => Haptics.impact({ style }));
}

/** The die reaches the glass. */
export async function revealHaptic(enabled: boolean): Promise<void> {
  if (!enabled) return;
  await safe(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  setTimeout(() => void safe(() => Haptics.notification({ type: NotificationType.Success })), 120);
}

export async function tapHaptic(enabled: boolean): Promise<void> {
  if (!enabled) return;
  await safe(() => Haptics.impact({ style: ImpactStyle.Medium }));
}
