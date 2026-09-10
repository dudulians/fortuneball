/**
 * App Store screenshots, taken from the running app — no phone, no simulator.
 *
 * Drives the dev server in headless Chrome at 440x956 CSS px with a 3x pixel
 * ratio, which is exactly the 1320x2868 that App Store Connect wants for the
 * 6.9" iPhone. Storage is seeded first, so the journal has a history worth
 * showing and the collection has rare answers already found.
 *
 *   npm run dev                       (in another terminal, port 5174)
 *   npm i -D playwright-core          (once; it drives the installed Chrome)
 *   node scripts/store-screenshots.mjs en
 *   node scripts/store-screenshots.mjs ru
 *
 * Output: store/screenshots/<lang>/01..05.png
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "fs";

const LANG = process.argv[2] === "ru" ? "ru" : "en";
const OUT = `store/screenshots/${LANG}`;
const URL = process.env.URL ?? "http://localhost:5174/";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DAY = 86400000;
const now = Date.now();

mkdirSync(OUT, { recursive: true });

const q = (i, question, answerId, answerLabel, tone, outcome, ago) => ({
  id: `h${i}`,
  kind: "question",
  question,
  answerId,
  answerLabel,
  tone,
  lang: LANG,
  askedAt: now - ago * DAY,
  checkAt: now - ago * DAY + 7 * DAY,
  ...(outcome ? { outcome } : {}),
});

// Eleven checked questions, eight of them right: the header reads 73%.
const DATA = {
  en: {
    heroQuestion: "Should I text him first?",
    goldenQuestion: "Am I doing the right thing?",
    options: ["Pizza", "Sushi"],
    choices: [["Pizza", "Sushi"], ["Stay in", "Go out"], ["Blue", "Red"]],
    found: {
      g01: "Will he text me back?",
      g05: "Am I doing the right thing?",
      g07: "Should I worry about Monday?",
      c01: "Is this meant to be?",
    },
    history: [
      q(1, "Will he text me back?", "p03", "YES, CLEARLY", "positive", "yes", 28),
      q(2, "Should I take the job?", "p06", "MOST LIKELY", "positive", "yes", 26),
      q(3, "Is he thinking about me?", "x02", "MY REPLY IS NO", "negative", "no", 24),
      q(4, "Will it rain on Saturday?", "p07", "OUTLOOK GOOD", "positive", "no", 22),
      q(5, "Should I cut my hair short?", "p01", "IT IS CERTAIN", "positive", "yes", 20),
      q(6, "Will I hear from them this week?", "x03", "SOURCES SAY NO", "negative", "no", 18),
      q(7, "Am I making the right call?", "p05", "AS I SEE IT, YES", "positive", "yes", 16),
      q(8, "Will the flat be mine?", "x01", "DO NOT COUNT ON IT", "negative", "yes", 14),
      q(9, "Should I message first?", "p09", "SIGNS SAY YES", "positive", "yes", 12),
      q(10, "Is it going to work out?", "p02", "WITHOUT A DOUBT", "positive", "no", 10),
      q(11, "Will she say yes?", "x05", "DOUBTFUL", "negative", "no", 8),
      q(12, "Is this the right city for me?", "p10", "STARS SAY YES", "positive", null, 5),
      q(13, "Will the trip happen in May?", "n02", "ASK AGAIN LATER", "neutral", null, 4),
      q(14, "Should I call my mother today?", "p04", "RELY ON IT", "positive", null, 2),
      q(15, "Will I finish it before Friday?", "p08", "YES", "positive", null, 1),
    ],
  },
  ru: {
    heroQuestion: "Написать ему первой?",
    goldenQuestion: "Я всё правильно делаю?",
    options: ["Пицца", "Суши"],
    choices: [["Пицца", "Суши"], ["Остаться", "Пойти"], ["Синий", "Красный"]],
    found: {
      g01: "Он ещё напишет?",
      g05: "Я всё правильно делаю?",
      g07: "Стоит ли волноваться?",
      c01: "Это судьба?",
    },
    history: [
      q(1, "Он напишет первым?", "p03", "КОНЕЧНО, ДА", "positive", "yes", 28),
      q(2, "Соглашаться на эту работу?", "p06", "СКОРЕЕ ВСЕГО", "positive", "yes", 26),
      q(3, "Он думает обо мне?", "x02", "ОТВЕТ: НЕТ", "negative", "no", 24),
      q(4, "В субботу будет дождь?", "p07", "ВСЁ ВЫЙДЕТ", "positive", "no", 22),
      q(5, "Постричься коротко?", "p01", "ЭТО ТОЧНО", "positive", "yes", 20),
      q(6, "Ответят на этой неделе?", "x03", "ЗВЁЗДЫ ПРОТИВ", "negative", "no", 18),
      q(7, "Я всё правильно решаю?", "p05", "ДУМАЮ, ДА", "positive", "yes", 16),
      q(8, "Квартира будет моей?", "x01", "НЕ НАДЕЙСЯ", "negative", "yes", 14),
      q(9, "Написать первой?", "p09", "ЗНАКИ ЗА", "positive", "yes", 12),
      q(10, "Всё получится?", "p02", "ДА. ТОЧКА", "positive", "no", 10),
      q(11, "Она согласится?", "x05", "НЕ УВЕРЕН", "negative", "no", 8),
      q(12, "Это мой город?", "p10", "ЗВЁЗДЫ ЗА", "positive", null, 5),
      q(13, "Поездка будет в мае?", "n02", "СПРОСИ ПОЗЖЕ", "neutral", null, 4),
      q(14, "Позвонить маме сегодня?", "p04", "ВЕРНОЕ ДЕЛО", "positive", null, 2),
      q(15, "Успею до пятницы?", "p08", "ДА", "positive", null, 1),
    ],
  },
}[LANG];

const stats = {
  shakes: 63,
  goldensAwarded: 2,
  goldenPostponed: 0,
  found: { g01: now - 21 * DAY, g05: now - 12 * DAY, g07: now - 6 * DAY, c01: now - 3 * DAY },
  foundQuestion: DATA.found,
};
const settings = { sound: true, haptics: true, reminders: true, lang: LANG, hasSeenIntro: true };

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--enable-unsafe-swiftshader"], // WebGL liquid without a GPU
});
const ctx = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: LANG === "ru" ? "ru-RU" : "en-US",
});
await ctx.addInitScript(([h, s, st, c]) => {
  localStorage.setItem("fortuneball.history.v1", h);
  localStorage.setItem("fortuneball.settings.v2", s);
  localStorage.setItem("fortuneball.stats.v1", st);
  localStorage.setItem("fortuneball.choices.v1", c);
}, [JSON.stringify(DATA.history), JSON.stringify(settings), JSON.stringify(stats), JSON.stringify(DATA.choices)]);

const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERR:", e.message));
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// 1 — a question answered
await page.fill(".question input", DATA.heroQuestion);
await page.click(".ball");
await page.waitForTimeout(4200);
await shot("01-answer");

// 2 — a golden answer, sparkles still in the air
await page.evaluate(() => window.__fortune.forceSpecial("g05"));
await page.fill(".question input", DATA.goldenQuestion);
await page.click(".ball");
await page.waitForTimeout(3600);
await shot("02-golden");

// 3 — the "choose" mode
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.click(".mode-switch button:nth-child(2)");
await page.waitForTimeout(400);
const opts = page.locator(".choose .option input");
await opts.nth(0).fill(DATA.options[0]);
await opts.nth(1).fill(DATA.options[1]);
await page.waitForTimeout(300);
await page.click(".ball");
await page.waitForTimeout(4200);
await shot("03-choose");

// 4 — the journal and the accuracy
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.click(".journal-button");
await page.waitForTimeout(900);
await shot("04-journal");

// 5 — the collection
await page.click(".tabs button:nth-child(2)");
await page.waitForTimeout(900);
await shot("05-collection");

console.log(`${OUT}: five screenshots, 1320x2868`);
await browser.close();
