import { ALL_ANSWERS, SPECIAL_ANSWERS, pickRandomAnswer, type Answer } from "./answers";

/**
 * Shake counter and the rare-answer collection.
 * Golden answers come on a schedule — the 15th shake, then the 40th, then
 * every 50 — so nobody has to be lucky to meet them. Cosmic ones are pure
 * luck, about 1 in 1000. Independent of the question either way.
 */

export interface Stats {
  shakes: number;
  /** How many scheduled golden answers have been handed out. */
  goldensAwarded: number;
  /** Times the person chose a regular answer while a golden one was due — it waits for the next shake. */
  goldenPostponed: number;
  /** Rare answer id → when it was found (epoch ms). */
  found: Record<string, number>;
  /** Rare answer id → the question typed when it came up ("" = asked silently). */
  foundQuestion: Record<string, string>;
}

const STORAGE_KEY = "fortuneball.stats.v1";
const COSMIC_ODDS = 1 / 1000;
const FIRST_GOLDEN = 15;
const SECOND_GOLDEN = 40;
const GOLDEN_EVERY = 50;

/** The shake number on which the k-th golden (0-based) is due. */
export function goldenDueAt(k: number): number {
  if (k <= 0) return FIRST_GOLDEN;
  return SECOND_GOLDEN + (k - 1) * GOLDEN_EVERY;
}

/** Shakes left until the next golden (0 = on the very next shake). */
export function shakesToNextGolden(stats: Stats): number {
  return Math.max(0, goldenDueAt(stats.goldensAwarded) + stats.goldenPostponed - stats.shakes - 1);
}

/** True when the very next shake would surface a golden answer. */
export function isGoldenDue(stats: Stats): boolean {
  return shakesToNextGolden(stats) === 0;
}

function defaults(): Stats {
  return { shakes: 0, goldensAwarded: 0, goldenPostponed: 0, found: {}, foundQuestion: {} };
}

/** Remembers which question a rare answer came up for (call once, right after it surfaces). */
export function recordFoundQuestion(id: string, question: string): Stats {
  const stats = loadStats();
  if (stats.foundQuestion[id] === undefined) {
    stats.foundQuestion[id] = question.trim();
    saveStats(stats);
  }
  return stats;
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<Stats> & { firstGoldenAt?: number };
    const found = parsed.found ?? {};
    // Older saves had random odds: count the goldens already found as awarded.
    const goldensAwarded =
      parsed.goldensAwarded ?? Object.keys(found).filter((id) => id.startsWith("g")).length;
    return {
      shakes: parsed.shakes ?? 0,
      goldensAwarded,
      goldenPostponed: parsed.goldenPostponed ?? 0,
      found,
      foundQuestion: parsed.foundQuestion ?? {},
    };
  } catch {
    return defaults();
  }
}

export function saveStats(s: Stats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/**
 * Golden answers fill the collection in order (first unfound slot), so progress
 * reads left to right. Cosmic ones are random among the unfound.
 */
function pickSpecial(rarity: "golden" | "cosmic", found: Record<string, number>): Answer {
  const pool = SPECIAL_ANSWERS.filter((a) => a.rarity === rarity);
  const unfound = pool.filter((a) => !found[a.id]);
  const from = unfound.length ? unfound : pool;
  if (rarity === "golden") return from[0];
  return from[Math.floor(Math.random() * from.length)];
}

/**
 * Counts one shake and decides what surfaces. `force` is for development only.
 * `skipGolden`: the person asked for a regular answer although a golden one was
 * due — the golden waits for the next shake.
 */
export function rollAnswer(
  excludeId?: string,
  force?: string,
  opts: { skipGolden?: boolean } = {}
): { answer: Answer; stats: Stats } {
  const stats = loadStats();
  const goldenDue = isGoldenDue(stats);
  stats.shakes += 1;

  let answer: Answer | undefined;
  if (force) answer = ALL_ANSWERS.find((a) => a.id === force);

  if (!answer && goldenDue) {
    if (opts.skipGolden) {
      stats.goldenPostponed += 1;
    } else {
      answer = pickSpecial("golden", stats.found);
      stats.goldensAwarded += 1;
      stats.goldenPostponed = 0;
    }
  }
  if (!answer && Math.random() < COSMIC_ODDS) answer = pickSpecial("cosmic", stats.found);
  if (!answer) answer = pickRandomAnswer(excludeId);

  if (answer.rarity && !stats.found[answer.id]) stats.found[answer.id] = Date.now();
  saveStats(stats);
  return { answer, stats };
}

export function collectionProgress(stats: Stats): { found: number; total: number } {
  return { found: SPECIAL_ANSWERS.filter((a) => stats.found[a.id]).length, total: SPECIAL_ANSWERS.length };
}
