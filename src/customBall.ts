import type { Answer, Tone } from "./answers";

/**
 * A ball of your own: your answers, your colour, your name for it.
 *
 * Every other ball in the store says "It is certain" in the same twenty ways.
 * This is the part none of them have — the ball can be filled with the things
 * you would actually want to hear, or the running joke you have with one
 * person, and it keeps the weight and the liquid of the real one.
 *
 * Custom answers are marked `custom`, so each is sized on its own: one long
 * answer cannot shrink the lettering of all the others, which is what happens
 * to the built-in set by design.
 */
export type BallHue = "blue" | "violet" | "amber" | "green" | "rose";

export interface CustomAnswer {
  id: string;
  text: string;
  /** Needed so the journal can still tell a yes from a no when scoring. */
  tone: Tone;
}

export interface CustomBall {
  /** Off until the person has written something and switched it on. */
  enabled: boolean;
  /** Shown in the top bar in place of the app name. Optional. */
  name: string;
  hue: BallHue;
  answers: CustomAnswer[];
}

/** The die reads badly past this; three short lines is the shape that fits. */
export const MAX_ANSWER_LEN = 26;
export const MAX_ANSWERS = 20;
export const MIN_ANSWERS = 3;

const STORAGE_KEY = "fortuneball.customBall.v1";

export function emptyBall(): CustomBall {
  return { enabled: false, name: "", hue: "blue", answers: [] };
}

export function loadCustomBall(): CustomBall {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBall();
    const parsed = JSON.parse(raw) as Partial<CustomBall>;
    const answers = Array.isArray(parsed.answers)
      ? parsed.answers
          .filter((a): a is CustomAnswer => !!a && typeof a.text === "string")
          .slice(0, MAX_ANSWERS)
          .map((a, i): CustomAnswer => ({
            id: a.id || `c${i}`,
            text: a.text.slice(0, MAX_ANSWER_LEN),
            tone: a.tone === "negative" || a.tone === "neutral" ? a.tone : "positive",
          }))
      : [];
    return {
      enabled: !!parsed.enabled && answers.length >= MIN_ANSWERS,
      name: typeof parsed.name === "string" ? parsed.name.slice(0, 24) : "",
      hue: isHue(parsed.hue) ? parsed.hue : "blue",
      answers,
    };
  } catch {
    return emptyBall();
  }
}

export function saveCustomBall(ball: CustomBall): CustomBall {
  const clean: CustomBall = {
    ...ball,
    answers: ball.answers.filter((a) => a.text.trim()).slice(0, MAX_ANSWERS),
  };
  // A ball with two answers is not a ball; it falls back to the built-in set.
  if (clean.answers.length < MIN_ANSWERS) clean.enabled = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Storage unavailable — the ball stays as it is for this session.
  }
  return clean;
}

function isHue(v: unknown): v is BallHue {
  return v === "blue" || v === "violet" || v === "amber" || v === "green" || v === "rose";
}

/**
 * The answers as the roller wants them, or null when the built-in set should
 * be used. `wrap` is the same line-breaker the "choose" mode uses, so a custom
 * answer lands on the die broken the way the written ones are.
 */
export function customPool(ball: CustomBall, wrap: (text: string) => string[]): Answer[] | null {
  if (!ball.enabled || ball.answers.length < MIN_ANSWERS) return null;
  return ball.answers.map((a) => {
    const text = wrap(a.text).join("\n");
    return { id: `custom:${a.id}`, tone: a.tone, en: text, ru: text, custom: true };
  });
}
