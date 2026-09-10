import type { Answer } from "./answers";

/**
 * The answer on screen, kept just long enough to survive a restart.
 *
 * iOS throws the web page away when memory runs short — during an ad, or on an
 * older phone under any pressure — and Capacitor quietly loads it again. The
 * app came back at its very first screen: the plain "8", the question gone,
 * the answer someone was still reading gone with it.
 *
 * So every reveal is written down, and a fresh page picks it up if it is only
 * seconds old. A minute and a half is the whole point: long enough to cover a
 * restart, short enough that opening the app tomorrow still greets you with
 * the "8" and not with yesterday's answer.
 */
const KEY = "fortuneball.lastAnswer.v1";
const STILL_WARM_MS = 90_000;

interface Saved {
  answer: Answer;
  question: string;
  at: number;
}

export function rememberLastAnswer(answer: Answer, question: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ answer, question, at: Date.now() } satisfies Saved));
  } catch {
    // Storage unavailable — a restart just costs the answer, as before.
  }
}

/** The answer this page was showing before it was reloaded, if that was moments ago. */
export function restoreLastAnswer(): { answer: Answer; question: string } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Saved>;
    if (!saved?.answer?.id || typeof saved.at !== "number") return null;
    if (Date.now() - saved.at > STILL_WARM_MS) return null;
    return { answer: saved.answer as Answer, question: typeof saved.question === "string" ? saved.question : "" };
  } catch {
    return null;
  }
}

export function forgetLastAnswer(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
