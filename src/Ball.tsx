import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Answer, Lang } from "./answers";
import { ANSWERS, answerText, sizedOnItsOwn } from "./answers";
import { fitTextsInTriangle, placeBlock, type TriangleFit } from "./fitText";
import { DIE_FONT, DIE_LETTER_SPACING_EM } from "./dieFont";
import LiquidWindow from "./liquid/LiquidWindow";

export type Phase = "idle" | "shaking" | "rising" | "shown";

export { DIE_FONT, DIE_LETTER_SPACING_EM };
export const BALL_IDLE_SRC = "/ball-idle.webp";
export const BALL_ANSWER_SRC = "/ball-answer.webp";

interface Props {
  phase: Phase;
  answer: Answer | null;
  lang: Lang;
  /** Changes every reveal so the bubbles replay. 0 = never revealed yet. */
  bubbleSeed: number;
}

function makeBubbles(seed: number) {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: 6 }, (_, i) => ({
    id: `${seed}-${i}`,
    left: 26 + rnd() * 48,
    size: 2 + rnd() * 4.5,
    delay: rnd() * 0.5,
    dur: 1.0 + rnd() * 0.6,
    drift: (rnd() - 0.5) * 24,
  }));
}

/**
 * Photoreal renders do the sphere. The only thing drawn live is the window:
 * a disc of dark liquid laid exactly over the render's window, where the
 * die surfaces with the answer.
 */
const Ball = forwardRef<HTMLDivElement, Props>(function Ball(
  { phase, answer, lang, bubbleSeed },
  wobbleRef
) {
  const text = answer ? answerText(answer, lang) : "";
  const lines = useMemo(() => (text ? text.split("\n") : []), [text]);
  const bubbles = useMemo(() => (bubbleSeed ? makeBubbles(bubbleSeed) : []), [bubbleSeed]);
  // Every answer of this language — the font size is solved for all of them at once.
  const allTexts = useMemo(() => ANSWERS.map((a) => answerText(a, lang).split("\n")), [lang]);
  const ownSize = !!answer && sizedOnItsOwn(answer);

  const dieRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<TriangleFit | null>(null);
  // WebGL window available? Until we know (or if not), the CSS window shows.
  const [gl, setGl] = useState(false);

  // Measure the die box (layout size, unaffected by the scale animation),
  // solve one font size that fits every answer, then place this answer's block.
  useLayoutEffect(() => {
    const el = dieRef.current;
    if (!el || lines.length === 0) return;

    const compute = () => {
      const T = el.offsetWidth;
      const H = el.offsetHeight;
      if (!T || !H) return;
      const opts = { topWidth: T, height: H, font: DIE_FONT, letterSpacingEm: DIE_LETTER_SPACING_EM, maxFontSize: T * 0.2 };
      const shared = fitTextsInTriangle(allTexts, opts);
      // a typed option or a rare answer keeps the standard size and only shrinks if it cannot fit
      const fontSize = ownSize ? Math.min(shared, fitTextsInTriangle([lines], opts)) : shared;
      setFit({ fontSize, ...placeBlock(lines.length, fontSize, H) });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(compute).catch(() => {});
    return () => ro.disconnect();
  }, [lines, allTexts, ownSize]);

  const dieUp = phase === "rising" || phase === "shown";
  const idleHidden = phase !== "idle";

  return (
    <div className={`ball-wobble phase-${phase}`} ref={wobbleRef}>
      <div className="ball-tilt">
        <div className="ball-body">
          <img className="ball-img" src={BALL_ANSWER_SRC} alt="" draggable={false} />

          {/* Steel bezel set into the sphere: a full disc, the window paints over its middle */}
          <div className="bezel" aria-hidden />

          {/* Live window, laid over the render's window. Sits under the idle image. */}
          <div className={`window ${gl ? "gl" : ""}`} aria-hidden>
            <LiquidWindow phase={phase} answer={answer} lang={lang} onSupport={setGl} />
            <div className="caustic" />

            <div className="bubbles" key={bubbleSeed}>
              {bubbles.map((b) => (
                <span
                  key={b.id}
                  className="bubble"
                  style={
                    {
                      left: `${b.left}%`,
                      width: `${b.size}px`,
                      height: `${b.size}px`,
                      "--delay": `${b.delay}s`,
                      "--dur": `${b.dur}s`,
                      "--drift": `${b.drift}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>

            <div
              ref={dieRef}
              className={`die tone-${answer?.rarity ?? answer?.tone ?? "positive"} ${dieUp ? "up" : "down"} ${
                phase === "shaking" ? "sink" : ""
              }`}
            >
              <div className={`die-inner ${phase === "rising" ? "wobbling" : ""}`}>
                {/* Neighbouring faces of the icosahedron, receding into the liquid */}
                <div className="facet facet-top" />
                <div className="facet facet-left" />
                <div className="facet facet-right" />
                <div className="die-rim" />
                <div className="die-face" />
                <div
                  className="die-text"
                  style={
                    fit
                      ? { top: `${fit.top}px`, fontSize: `${fit.fontSize}px`, lineHeight: `${fit.lineHeight}px` }
                      : { opacity: 0 }
                  }
                >
                  {lines.map((l, i) => (
                    <span className="die-line" key={i}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="liquid-tint" />
            <div className="glass" />
          </div>

          {/* Domed glass over the window. Under the idle render (the "8" side), so it appears
              together with the window on the first shake. */}
          <div className="lens" aria-hidden />

          <img
            className={`ball-img idle ${idleHidden ? "hidden" : ""}`}
            src={BALL_IDLE_SRC}
            alt=""
            draggable={false}
          />

          <div className="ball-sheen" />
        </div>
      </div>
    </div>
  );
});

export default Ball;
