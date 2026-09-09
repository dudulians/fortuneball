import type { Lang, Rarity, Tone } from "./answers";

/**
 * One asked question (or one choice). Only questions typed as text are stored —
 * a silent shake leaves no trace. "Did it come true?" builds on this.
 */
export type Outcome = "yes" | "no" | "unknown";

export interface HistoryEntry {
  id: string;
  kind: "question" | "choice";
  question: string; // the question, or the options joined with " · "
  answerId: string;
  /** Answer as shown, one line (for lists and notifications). */
  answerLabel: string;
  tone: Tone;
  rarity?: Rarity;
  lang: Lang;
  askedAt: number; // epoch ms
  /** When to ask "did it come true?" — questions only. */
  checkAt?: number;
  outcome?: Outcome;
  /** "Not yet" presses so far (max 3, then the question closes as unknown). */
  snoozes?: number;
  notificationId?: number;
  /** The same question asked again while this one was still open: later answers, oldest first. */
  repeats?: Repeat[];
}

export interface Repeat {
  at: number;
  answerId: string;
  answerLabel: string;
}

/** Same question, ignoring case, spacing and punctuation. */
export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const STORAGE_KEY = "fortuneball.history.v1";
const MAX_ENTRIES = 500;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_SNOOZES = 3;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // entries from before "kind" existed were all questions
    const entries = (parsed as Partial<HistoryEntry>[]).map((e) => ({
      kind: "question",
      answerLabel: "",
      ...e,
    })) as HistoryEntry[];
    const merged = mergeDuplicates(entries);
    if (merged.length !== entries.length) saveHistory(merged);
    return merged;
  } catch {
    return [];
  }
}

/**
 * Folds repeated asks of the same open question into the first one, so the
 * journal shows one line per question with a "×N" mark instead of a pile.
 */
function mergeDuplicates(entries: HistoryEntry[]): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  const openByQuestion = new Map<string, HistoryEntry>();
  for (const e of entries) {
    if (e.kind !== "question") {
      out.push(e);
      continue;
    }
    const key = normalizeQuestion(e.question);
    const base = openByQuestion.get(key);
    if (base && !e.outcome && !base.outcome && !isDodge(base)) {
      base.repeats = [
        ...(base.repeats ?? []),
        { at: e.askedAt, answerId: e.answerId, answerLabel: e.answerLabel },
        ...(e.repeats ?? []),
      ];
      continue;
    }
    out.push(e);
    if (!e.outcome) openByQuestion.set(key, e);
  }
  return out;
}

function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // ignore
  }
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "askedAt">): HistoryEntry {
  const full: HistoryEntry = {
    ...entry,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    askedAt: Date.now(),
  };
  const all = loadHistory();
  all.push(full);
  saveHistory(all);
  return full;
}

/**
 * Records a question. If the same question is still open (no outcome yet),
 * the new answer is appended to it as a repeat and that entry is returned —
 * the first answer stays the one that gets checked. Otherwise a new entry.
 */
export function recordQuestion(
  entry: Omit<HistoryEntry, "id" | "askedAt" | "kind">
): { entry: HistoryEntry; repeated: boolean } {
  const key = normalizeQuestion(entry.question);
  const all = loadHistory();
  const open = all.find((e) => e.kind === "question" && !e.outcome && normalizeQuestion(e.question) === key);
  if (open) {
    if (isDodge(open)) {
      // The ball had said "ask later": this answer becomes the real one and gets the check.
      open.repeats = [...(open.repeats ?? []), { at: open.askedAt, answerId: open.answerId, answerLabel: open.answerLabel }];
      open.answerId = entry.answerId;
      open.answerLabel = entry.answerLabel;
      open.tone = entry.tone;
      open.rarity = entry.rarity;
      open.checkAt = entry.checkAt;
      open.notificationId = undefined;
      saveHistory(all);
      return { entry: open, repeated: false };
    }
    open.repeats = [...(open.repeats ?? []), { at: Date.now(), answerId: entry.answerId, answerLabel: entry.answerLabel }];
    saveHistory(all);
    return { entry: open, repeated: true };
  }
  return { entry: addHistoryEntry({ ...entry, kind: "question" }), repeated: false };
}

/** "Ask again later" and friends: the ball dodged, nothing to check. */
export function isDodge(e: HistoryEntry): boolean {
  return e.kind === "question" && e.tone === "neutral" && !e.rarity;
}

/** Can this entry be marked came true / didn't? */
export function isCheckable(e: HistoryEntry): boolean {
  return e.kind === "question" && !e.outcome && !isDodge(e) && !e.rarity;
}

export function deleteHistoryEntry(id: string): HistoryEntry | undefined {
  const all = loadHistory();
  const i = all.findIndex((e) => e.id === id);
  if (i < 0) return undefined;
  const [removed] = all.splice(i, 1);
  saveHistory(all);
  return removed;
}

/** Removes everything; returns what was removed (to cancel reminders). */
export function clearHistory(): HistoryEntry[] {
  const all = loadHistory();
  saveHistory([]);
  return all;
}

export function updateHistoryEntry(id: string, patch: Partial<HistoryEntry>): HistoryEntry | undefined {
  const all = loadHistory();
  const i = all.findIndex((e) => e.id === id);
  if (i < 0) return undefined;
  all[i] = { ...all[i], ...patch };
  saveHistory(all);
  return all[i];
}

/** Questions whose check-in time has come and that have no outcome yet, oldest first. */
export function dueCheckIns(now = Date.now()): HistoryEntry[] {
  return loadHistory()
    .filter((e) => e.kind === "question" && e.checkAt !== undefined && e.checkAt <= now && !e.outcome)
    .sort((a, b) => (a.checkAt ?? 0) - (b.checkAt ?? 0));
}

/**
 * Accuracy: a "yes"-toned answer that came true, or a "no"-toned answer that
 * didn't, is a hit. Neutral, rare and unknown ones don't count.
 */
export function accuracy(entries = loadHistory()): { hits: number; checked: number; percent: number | null } {
  let hits = 0;
  let checked = 0;
  for (const e of entries) {
    if (e.kind !== "question" || e.rarity || e.tone === "neutral") continue;
    if (e.outcome !== "yes" && e.outcome !== "no") continue;
    checked += 1;
    const cameTrue = e.outcome === "yes";
    if ((e.tone === "positive" && cameTrue) || (e.tone === "negative" && !cameTrue)) hits += 1;
  }
  return { hits, checked, percent: checked ? Math.round((hits / checked) * 100) : null };
}
