import { useCallback, useEffect, useRef } from "react";

/**
 * Damped spring on translate + rotate. `kick()` adds a random impulse;
 * the element then swings and settles like a real ball being shaken.
 * Runs on requestAnimationFrame only while there is motion.
 */
export function useWobble<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const state = useRef({
    x: 0, y: 0, r: 0,
    vx: 0, vy: 0, vr: 0,
    raf: 0 as number,
    last: 0,
  });

  const step = useCallback((now: number) => {
    const s = state.current;
    const dt = Math.min(0.032, (now - (s.last || now)) / 1000 || 0.016);
    s.last = now;

    const k = 140;   // stiffness
    const c = 11;    // damping
    // Spring towards 0 on every axis.
    s.vx += (-k * s.x - c * s.vx) * dt;
    s.vy += (-k * s.y - c * s.vy) * dt;
    s.vr += (-k * s.r - c * s.vr) * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.r += s.vr * dt;

    if (ref.current) {
      ref.current.style.transform =
        `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0) rotate(${s.r.toFixed(2)}deg)`;
    }

    const energy =
      Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.r) +
      Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vr);
    if (energy > 0.05) {
      s.raf = requestAnimationFrame(step);
    } else {
      s.x = s.y = s.r = s.vx = s.vy = s.vr = 0;
      s.raf = 0;
      s.last = 0;
      if (ref.current) ref.current.style.transform = "";
    }
  }, []);

  const kick = useCallback((strength = 1) => {
    const s = state.current;
    const dir = Math.random() < 0.5 ? -1 : 1;
    s.vx += dir * (160 + Math.random() * 120) * strength;
    s.vy += (Math.random() - 0.5) * 160 * strength;
    s.vr += -dir * (90 + Math.random() * 70) * strength;
    if (!s.raf) s.raf = requestAnimationFrame(step);
  }, [step]);

  useEffect(() => {
    return () => {
      if (state.current.raf) cancelAnimationFrame(state.current.raf);
    };
  }, []);

  return { ref, kick };
}
