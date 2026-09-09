import { useMemo } from "react";
import type { Rarity } from "./answers";

interface Props {
  /** Changes on every rare reveal so the sparkles replay. */
  seed: number;
  kind: Rarity;
}

/** A handful of slow, tiny lights drifting up around the ball when a rare answer lands. */
export default function Sparkles({ seed, kind }: Props) {
  const dots = useMemo(() => {
    let s = seed * 7919 + 13;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: kind === "cosmic" ? 22 : 14 }, (_, i) => ({
      id: `${seed}-${i}`,
      left: 8 + rnd() * 84,
      top: 20 + rnd() * 70,
      size: 2 + rnd() * 3,
      delay: rnd() * 1.4,
      dur: 2.2 + rnd() * 1.6,
      drift: (rnd() - 0.5) * 40,
    }));
  }, [seed, kind]);

  return (
    <div className={`sparkles ${kind}`} aria-hidden>
      {dots.map((d) => (
        <span
          key={d.id}
          className="sparkle"
          style={
            {
              left: `${d.left}%`,
              top: `${d.top}%`,
              width: `${d.size}px`,
              height: `${d.size}px`,
              "--delay": `${d.delay}s`,
              "--dur": `${d.dur}s`,
              "--drift": `${d.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
