export type Tone = "positive" | "neutral" | "negative";
export type Rarity = "golden" | "cosmic";
export type Lang = "en" | "ru";

export interface Answer {
  /** Stable id — history and accuracy stats reference it. Never renumber. */
  id: string;
  tone: Tone;
  /** Lines are separated with \n so they fit inside the triangle. */
  en: string;
  ru: string;
  /** Rare answers: not yes/no, but a moment. Excluded from accuracy. */
  rarity?: Rarity;
  /** A text the user typed (the "choose" mode) — sized on its own, never counted. */
  custom?: boolean;
}

// 20 answers: 10 positive, 5 neutral, 5 negative — one per face of the die.
// All answers share one font size on the die, so every text is kept compact:
// top line ≤ 9 characters, second ≤ 7, third ≤ 5. Longer texts shrink ALL of them.
export const ANSWERS: Answer[] = [
  // ---- positive ----
  { id: "p01", tone: "positive", en: "IT IS\nCERTAIN", ru: "ЭТО\nТОЧНО" },
  { id: "p02", tone: "positive", en: "WITHOUT\nA DOUBT", ru: "ДА.\nТОЧКА" },
  { id: "p03", tone: "positive", en: "YES,\nCLEARLY", ru: "КОНЕЧНО,\nДА" },
  { id: "p04", tone: "positive", en: "RELY\nON IT", ru: "ВЕРНОЕ\nДЕЛО" },
  { id: "p05", tone: "positive", en: "AS I SEE\nIT, YES", ru: "ДУМАЮ,\nДА" },
  { id: "p06", tone: "positive", en: "MOST\nLIKELY", ru: "СКОРЕЕ\nВСЕГО" },
  { id: "p07", tone: "positive", en: "OUTLOOK\nGOOD", ru: "ВСЁ\nВЫЙДЕТ" },
  { id: "p08", tone: "positive", en: "YES", ru: "ДА" },
  { id: "p09", tone: "positive", en: "SIGNS\nSAY YES", ru: "ЗНАКИ\nЗА" },
  { id: "p10", tone: "positive", en: "STARS\nSAY YES", ru: "ЗВЁЗДЫ\nЗА" },

  // ---- neutral ----
  { id: "n01", tone: "neutral", en: "REPLY\nHAZY", ru: "ПОКА\nТУМАННО" },
  { id: "n02", tone: "neutral", en: "ASK AGAIN\nLATER", ru: "СПРОСИ\nПОЗЖЕ" },
  { id: "n03", tone: "neutral", en: "BETTER\nNOT SAY\nNOW", ru: "ЛУЧШЕ НЕ\nСЕЙЧАС" },
  { id: "n04", tone: "neutral", en: "CANNOT\nPREDICT\nNOW", ru: "СЕЙЧАС\nНЕ ВИЖУ" },
  { id: "n05", tone: "neutral", en: "TOO HAZY\nTO SAY", ru: "СПРОСИ\nЕЩЁ РАЗ" },

  // ---- negative ----
  { id: "x01", tone: "negative", en: "DON'T\nCOUNT\nON IT", ru: "НЕ\nНАДЕЙСЯ" },
  { id: "x02", tone: "negative", en: "MY REPLY\nIS NO", ru: "ОТВЕТ:\nНЕТ" },
  { id: "x03", tone: "negative", en: "SOURCES\nSAY NO", ru: "ЗВЁЗДЫ\nПРОТИВ" },
  { id: "x04", tone: "negative", en: "NOT\nLOOKING\nGOOD", ru: "ВРЯД ЛИ" },
  { id: "x05", tone: "negative", en: "DOUBTFUL", ru: "НЕ\nУВЕРЕН" },
];

/**
 * Rare answers: golden ones on a schedule (15th shake, 40th, then every 50),
 * cosmic ones ≈ 1 in 1000. They are not yes/no but a thought to keep — written
 * for the questions people really ask (does he love me, should I leave, will it work out).
 * They size themselves on the die (never larger than the ordinary answers), so up to
 * three lines of ~12 characters are fine.
 */
export const SPECIAL_ANSWERS: Answer[] = [
  { id: "g01", rarity: "golden", tone: "positive", en: "WHAT IS YOURS\nWILL FIND\nYOU", ru: "ТВОЁ\nТЕБЯ\nНАЙДЁТ" },
  { id: "g02", rarity: "golden", tone: "positive", en: "IF YOU ASK,\nYOU KNOW", ru: "ВОПРОС —\nУЖЕ ОТВЕТ" },
  { id: "g03", rarity: "golden", tone: "positive", en: "NOT EVERY\nDOOR IS\nFOR YOU", ru: "НЕ КАЖДАЯ\nДВЕРЬ\nТВОЯ" },
  { id: "g04", rarity: "golden", tone: "positive", en: "TIME WILL\nSAY IT\nSOFTLY", ru: "ВРЕМЯ\nСКАЖЕТ\nМЯГЧЕ" },
  { id: "g05", rarity: "golden", tone: "positive", en: "YOU ARE\nTHE ANSWER", ru: "ОТВЕТ —\nЭТО ТЫ" },
  { id: "g06", rarity: "golden", tone: "positive", en: "WHAT YOU\nFEAR IS\nNOT HERE", ru: "ТО, ЧЕГО\nБОИШЬСЯ,\nНЕ ЗДЕСЬ" },
  { id: "g07", rarity: "golden", tone: "positive", en: "LET IT\nBE EASY", ru: "ПУСТЬ\nБУДЕТ\nЛЕГКО" },
  { id: "g08", rarity: "golden", tone: "positive", en: "SOME YES\nTAKE\nTHEIR TIME", ru: "НЕКОТОРЫМ\n«ДА»\nНУЖНО ВРЕМЯ" },
  { id: "g09", rarity: "golden", tone: "positive", en: "ASK YOUR\nHEART,\nNOT ME", ru: "СПРОСИ\nСЕРДЦЕ,\nНЕ МЕНЯ" },
  { id: "g10", rarity: "golden", tone: "positive", en: "THE RIGHT\nONE STAYS", ru: "ТОТ, КТО\nТВОЙ,\nОСТАНЕТСЯ" },
  { id: "g11", rarity: "golden", tone: "positive", en: "LOSING IT\nMAKES ROOM", ru: "ПОТЕРЯ\nОСВОБОЖДАЕТ\nМЕСТО" },
  { id: "g12", rarity: "golden", tone: "positive", en: "YOU HAVE\nALREADY\nCHOSEN", ru: "ВЫБОР\nУЖЕ СДЕЛАН" },
  { id: "c01", rarity: "cosmic", tone: "positive", en: "WRITTEN\nIN THE\nSTARS", ru: "НАПИСАНО\nВ ЗВЁЗДАХ" },
  { id: "c02", rarity: "cosmic", tone: "positive", en: "ONE IN\nA THOUSAND", ru: "ОДИН\nНА ТЫСЯЧУ" },
  { id: "c03", rarity: "cosmic", tone: "positive", en: "THE COSMOS\nBLINKED", ru: "КОСМОС\nМОРГНУЛ" },
];

/** Every built-in answer (ordinary + rare), for lookups. */
export const ALL_ANSWERS: Answer[] = [...ANSWERS, ...SPECIAL_ANSWERS];

/** Texts that share one die font size: the 20 ordinary answers. Rare and typed ones size themselves, never larger. */
export function sizedOnItsOwn(a: Answer): boolean {
  return !!a.custom || !!a.rarity;
}

export function answerText(a: Answer, lang: Lang): string {
  return lang === "ru" ? a.ru : a.en;
}

export function findAnswer(id: string): Answer | undefined {
  return ALL_ANSWERS.find((a) => a.id === id);
}

/** Uniform random pick among the 20 ordinary answers. Deliberately independent of the question. */
export function pickRandomAnswer(exclude?: string): Answer {
  const pool = exclude && ANSWERS.length > 1 ? ANSWERS.filter((a) => a.id !== exclude) : ANSWERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** The "choose" mode: the die surfaces with one of the user's own options. */
export const CHOICE_ID = "choice";

export function makeChoiceAnswer(lines: string[]): Answer {
  const text = lines.join("\n");
  return { id: CHOICE_ID, tone: "positive", en: text, ru: text, custom: true };
}
