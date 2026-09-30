/**
 * The captioned version of the store screenshots: one line of Manrope over the
 * screenshot, on the app's own backdrop. Composed in the app's page so the
 * caption is set in the real typeface, at the same size as the raw shots.
 *
 *   node scripts/store-frames.mjs en 1284x2778
 *   node scripts/store-frames.mjs ru 1284x2778
 *
 * Reads  store/screenshots/<size>/<lang>/
 * Writes store/screenshots/<size>/<lang>-captioned/
 */
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "fs";
import { SIZES } from "./store-sizes.mjs";

const LANG = process.argv[2] === "ru" ? "ru" : "en";
const SIZE = process.argv[3] ?? "1284x2778";
const VIEWPORT = SIZES[SIZE];
if (!VIEWPORT) {
  console.error(`Unknown size ${SIZE}. Try one of: ${Object.keys(SIZES).join(", ")}`);
  process.exit(1);
}
const IN = `store/screenshots/${SIZE}/${LANG}`;
const OUT = `store/screenshots/${SIZE}/${LANG}-captioned`;
const URL = process.env.URL ?? "http://localhost:5174/";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

mkdirSync(OUT, { recursive: true });

// Store order: what the app is for first — choosing, and the record it keeps —
// then the ball itself. The first screenshot is the one shown in search results,
// and it decides whether this reads as a decision tool or as one more oracle.
const CAPTIONS = {
  en: [
    { src: "03-choose.png", out: "1-choose.png", text: "Two options.\nOne shake. Decided." },
    { src: "04-journal.png", out: "2-decisions.png", text: "Every decision,\nchecked a week later." },
    { src: "01-answer.png", out: "3-answer.png", text: "Or just ask\nyes or no." },
    { src: "02-golden.png", out: "4-golden.png", text: "Rare golden answers\nworth shaking for." },
    { src: "05-collection.png", out: "5-collection.png", text: "15 rare answers\nto find." },
  ],
  ru: [
    { src: "03-choose.png", out: "1-choose.png", text: "Два варианта.\nОдна тряска. Решено." },
    { src: "04-journal.png", out: "2-decisions.png", text: "Каждое решение\nпроверяется через неделю." },
    { src: "01-answer.png", out: "3-answer.png", text: "Или просто спроси:\nда или нет." },
    { src: "02-golden.png", out: "4-golden.png", text: "Редкие золотые ответы —\nради них и трясут." },
    { src: "05-collection.png", out: "5-collection.png", text: "15 редких ответов,\nкоторые надо найти." },
  ],
}[LANG];

const FONT_SIZE = LANG === "ru" ? 28 : 31;

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 3 });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" }); // for Manrope, already loaded here
await page.waitForTimeout(800);

for (const f of CAPTIONS) {
  const data = readFileSync(`${IN}/${f.src}`).toString("base64");
  // The layout was drawn against a 440x956 frame; every other size is that
  // design scaled, so the caption and the phone keep their proportions.
  const k = VIEWPORT.width / 440;
  await page.evaluate(({ data, text, fontSize, w, h, k }) => {
    document.body.innerHTML =
      `<div id="frame"><p id="cap">${text.replace(/\n/g, "<br>")}</p>` +
      `<img id="shot" src="data:image/png;base64,${data}"></div>`;
    let style = document.getElementById("framestyle");
    if (!style) {
      style = document.createElement("style");
      style.id = "framestyle";
      document.head.appendChild(style);
    }
    const px = (v) => `${Math.round(v * k)}px`;
    style.textContent = `
      html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#06060a; }
      #frame { position:relative; width:${w}px; height:${h}px; overflow:hidden;
        background: radial-gradient(ellipse 90% 60% at 50% 20%, #1b1b33 0%, #0d0d19 55%, #06060a 100%); }
      #cap { position:absolute; top:${px(64)}; left:${px(20)}; right:${px(20)}; margin:0; text-align:center;
        font-family:"Manrope","Helvetica Neue",Arial,sans-serif; font-weight:700; font-size:${px(fontSize)};
        line-height:1.22; letter-spacing:-0.015em; color:#f1eee8; }
      #shot { position:absolute; top:${px(206)}; left:50%; transform:translateX(-50%); width:${px(360)};
        border-radius:${px(34)}; box-shadow:0 ${px(26)} ${px(60)} rgba(0,0,0,0.6), 0 0 0 1px rgba(241,238,232,0.10); }
    `;
  }, { data, text: f.text, fontSize: FONT_SIZE, w: VIEWPORT.width, h: VIEWPORT.height, k });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${f.out}` });
  console.log(`${OUT}/${f.out}`);
}
await browser.close();
