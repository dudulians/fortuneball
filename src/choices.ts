/** The "choose" mode: the last five option sets, newest first, so "pizza or sushi" is one tap. */

const STORAGE_KEY = "fortuneball.choices.v1";
const MAX_SETS = 5;

export function loadRecentChoices(): string[][] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as string[][]).filter((s) => Array.isArray(s) && s.length >= 2) : [];
  } catch {
    return [];
  }
}

export function rememberChoice(options: string[]): string[][] {
  const clean = options.map((o) => o.trim()).filter(Boolean);
  const key = clean.map((o) => o.toLowerCase()).join("|");
  const rest = loadRecentChoices().filter((s) => s.map((o) => o.toLowerCase()).join("|") !== key);
  const next = [clean, ...rest].slice(0, MAX_SETS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
