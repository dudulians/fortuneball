import { useEffect, useState } from "react";
import type { Lang } from "./answers";
import { detectLang } from "./i18n";

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** "Did it come true?" reminders as local notifications. */
  reminders: boolean;
  lang: Lang;
  hasSeenIntro: boolean;
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
  };
}

function load(): Settings {
  const base = defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const lang: Lang = parsed.lang === "ru" || parsed.lang === "en" ? parsed.lang : base.lang;
    return { ...base, ...parsed, lang };
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
