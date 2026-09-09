import { Motion } from "@capacitor/motion";

type Cleanup = () => void;

/** Smoothed device tilt (-1..1), written by the app's tilt loop, read by renderers. */
export const tiltState = { x: 0, y: 0 };

/**
 * iOS 13+ only hands out motion/orientation events after an explicit
 * permission request made from a user gesture (tap). Safe no-op elsewhere.
 * Result is cached so the prompt shows at most once per launch.
 */
let permissionPromise: Promise<boolean> | null = null;

export function requestMotionPermission(): Promise<boolean> {
  if (permissionPromise) return permissionPromise;
  permissionPromise = (async () => {
    let granted = true;
    const w = window as unknown as {
      DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
      DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
    };
    for (const E of [w.DeviceMotionEvent, w.DeviceOrientationEvent]) {
      if (E && typeof E.requestPermission === "function") {
        try {
          const r = await E.requestPermission();
          if (r !== "granted") granted = false;
        } catch {
          granted = false;
        }
      }
    }
    if (!granted) permissionPromise = null; // allow retry on next gesture
    return granted;
  })();
  return permissionPromise;
}

/** How hard the phone is being shaken right now (0..1). Bumped by jolts, decayed by the renderer. */
export const shakeState = { vigor: 0 };

export interface ShakeCallbacks {
  /** Every strong jolt (a direction change of the hand), with its acceleration in m/s². */
  onJolt: (magnitude: number) => void;
  /** Shaking has begun: two jolts inside a short window (a single bump doesn't count). */
  onStart: () => void;
  /** No jolt for `quietMs`: the hand has stopped. */
  onStop: () => void;
}

/**
 * Continuous shake monitor. Unlike a one-shot trigger it follows the whole
 * gesture: every jolt is reported (for haptics, sound and the ball's wobble),
 * and shaking lasts exactly as long as the person keeps moving the phone.
 */
export function listenForShake(
  cb: ShakeCallbacks,
  opts: { threshold?: number; windowMs?: number; quietMs?: number } = {}
): Cleanup {
  // 16 m/s² (gravity excluded) is a deliberate shake; walking, turning or picking the phone up stays well below.
  const threshold = opts.threshold ?? 16;
  const windowMs = opts.windowMs ?? 700;
  const quietMs = opts.quietMs ?? 450;

  let joltTimes: number[] = [];
  let active = false;
  let quietTimer = 0;
  let disposed = false;
  let handle: { remove: () => void } | undefined;

  const stop = () => {
    if (!active) return;
    active = false;
    joltTimes = [];
    cb.onStop();
  };

  const jolt = (magnitude: number) => {
    const now = Date.now();
    // Peaks closer than 60ms are the same jolt.
    if (joltTimes.length && now - joltTimes[joltTimes.length - 1] < 60) return;
    joltTimes = joltTimes.filter((t) => now - t < windowMs);
    joltTimes.push(now);
    shakeState.vigor = Math.min(1, shakeState.vigor + magnitude / 40);

    window.clearTimeout(quietTimer);
    quietTimer = window.setTimeout(stop, quietMs);

    if (!active && joltTimes.length >= 2) {
      active = true;
      cb.onStart();
    }
    if (active) cb.onJolt(magnitude);
  };

  (async () => {
    try {
      handle = await Motion.addListener("accel", (event) => {
        if (disposed) return;
        const a = event.acceleration ?? event.accelerationIncludingGravity;
        if (!a) return;
        const magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
        const effective = event.acceleration ? magnitude : Math.abs(magnitude - 9.81);
        if (effective >= threshold) jolt(effective);
      });
      if (disposed) handle?.remove?.();
    } catch {
      // No sensor (desktop preview) — tap still works.
    }
  })();

  // Dev-only: lets the browser preview feed synthetic jolts through the same path.
  if (import.meta.env.DEV) {
    (window as unknown as { __shake?: unknown }).__shake = { jolt, stop };
  }

  return () => {
    disposed = true;
    window.clearTimeout(quietTimer);
    handle?.remove?.();
  };
}

/**
 * Device tilt as a smoothed vector in [-1, 1]. Drives the highlight
 * on the ball so it reads as a real glossy sphere.
 * Native: Capacitor Motion orientation events. Browser: deviceorientation.
 * Desktop preview: mouse position.
 */
export function listenForTilt(onTilt: (x: number, y: number) => void): Cleanup {
  let disposed = false;
  let handle: { remove: () => void } | undefined;
  let gotSensor = false;

  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  const fromAngles = (beta: number | null, gamma: number | null) => {
    if (beta == null || gamma == null) return;
    gotSensor = true;
    // Phone held upright: beta ≈ 45–90 (pitch), gamma = roll.
    onTilt(clamp(gamma / 35), clamp((beta - 50) / 35));
  };

  (async () => {
    try {
      handle = await Motion.addListener("orientation", (e) => {
        if (!disposed) fromAngles(e.beta, e.gamma);
      });
      if (disposed) handle?.remove?.();
    } catch {
      // fall through to mouse fallback
    }
  })();

  const onMouse = (e: MouseEvent) => {
    if (gotSensor || disposed) return;
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    onTilt(clamp(x), clamp(y));
  };
  window.addEventListener("mousemove", onMouse, { passive: true });

  return () => {
    disposed = true;
    handle?.remove?.();
    window.removeEventListener("mousemove", onMouse);
  };
}
