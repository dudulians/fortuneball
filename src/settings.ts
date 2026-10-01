import { useEffect, useState } from "react";
import type { Lang } from "./answers";

/** Yes/No is the ball people know; Choose is what the app is actually for. */
export type Mode = "yesno" | "choose";
import { detectLang } from "./i18n";

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** "Did it come true?" reminders as local notifications. */
  reminders: boolean;
  lang: Lang;
  hasSeenIntro: boolean;
  /** Type scale: 1 is the drawn size, up to 1.3 for eyes that need it. */
  textScale: number;
  /** Lifts the muted greys to full strength for anyone who loses them. */
  highContrast: boolean;
  /**
   * Which side of the switch the app opens on. New people land in "choose":
   * the first thing the app should say about itself is that it helps decide
   * between two things, not that it tells fortunes.
   */
  mode: Mode;
}

const STORAGE_KEY = "fortuneball.settings.v2";
const LEGACY_KEY = "magic8ball.settings.v1";

function defaults(): Settings {
  return {
    sound: true,
    haptics: true,
    reminders: true,
    lang: detectLang(),
    hasSeenIntro: false,
    mode: "choose",
    textScale: 1,
    highContrast: false,
  };
}

function load(): Settings {
  const base = defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const lang: Lang = parsed.lang === "ru" || parsed.lang === "en" ? parsed.lang : base.lang;
    const mode: Mode = parsed.mode === "yesno" || parsed.mode === "choose" ? parsed.mode : base.mode;
    const textScale = typeof parsed.textScale === "number" && parsed.textScale >= 1 && parsed.textScale <= 1.3
      ? parsed.textScale
      : base.textScale;
    return { ...base, ...parsed, lang, mode, textScale };
  } catch {
    return base;
  }
}

function save(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable (private mode etc.) — ignore.
  }
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    save(settings);
  }, [settings]);

  const update = (patch: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  return [settings, update];
}
