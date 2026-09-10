/**
 * The captioned version of the store screenshots: one line of Manrope over the
 * screenshot, on the app's own backdrop. Composed in the app's page so the
 * caption is set in the real typeface, at 1320x2868 like the raw shots.
 *
 *   node scripts/store-frames.mjs en
 *   node scripts/store-frames.mjs ru
 *
 * Reads  store/screenshots/<lang>/
 * Writes store/screenshots/<lang>-captioned/
 */
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "fs";

const LANG = process.argv[2] === "ru" ? "ru" : "en";
const IN = `store/screenshots/${LANG}`;
const OUT = `store/screenshots/${LANG}-captioned`;
const URL = process.env.URL ?? "http://localhost:5174/";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

mkdirSync(OUT, { recursive: true });

// Store order: the answer first, then the reason to come back, then the rest.
const CAPTIONS = {
  en: [
    { src: "01-answer.png", out: "1-answer.png", text: "Ask anything.\nShake for an answer." },
    { src: "04-journal.png", out: "2-journal.png", text: "It remembers —\nand keeps score." },
    { src: "03-choose.png", out: "3-choose.png", text: "Can’t decide?\nLet the ball pick." },
    { src: "02-golden.png", out: "4-golden.png", text: "Rare golden answers\nworth shaking for." },
    { src: "05-collection.png", out: "5-collection.png", text: "15 rare answers\nto find." },
  ],
  ru: [
    { src: "01-answer.png", out: "1-answer.png", text: "Спроси и встряхни.\nШар ответит." },
    { src: "04-journal.png", out: "2-journal.png", text: "Шар помнит вопрос\nи считает попадания." },
    { src: "03-choose.png", out: "3-choose.png", text: "Не можешь выбрать?\nПусть решит шар." },
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
const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" }); // for Manrope, already loaded here
await page.waitForTimeout(800);

for (const f of CAPTIONS) {
  const data = readFileSync(`${IN}/${f.src}`).toString("base64");
  await page.evaluate(({ data, text, fontSize }) => {
    document.body.innerHTML =
      `<div id="frame"><p id="cap">${text.replace(/\n/g, "<br>")}</p>` +
      `<img id="shot" src="data:image/png;base64,${data}"></div>`;
    let style = document.getElementById("framestyle");
    if (!style) {
      style = document.createElement("style");
      style.id = "framestyle";
      document.head.appendChild(style);
    }
    style.textContent = `
      html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#06060a; }
      #frame { position:relative; width:440px; height:956px; overflow:hidden;
        background: radial-gradient(ellipse 90% 60% at 50% 20%, #1b1b33 0%, #0d0d19 55%, #06060a 100%); }
      #cap { position:absolute; top:64px; left:20px; right:20px; margin:0; text-align:center;
        font-family:"Manrope","Helvetica Neue",Arial,sans-serif; font-weight:700; font-size:${fontSize}px;
        line-height:1.22; letter-spacing:-0.015em; color:#f1eee8; }
      #shot { position:absolute; top:206px; left:50%; transform:translateX(-50%); width:360px;
        border-radius:34px; box-shadow:0 26px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(241,238,232,0.10); }
    `;
  }, { data, text: f.text, fontSize: FONT_SIZE });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${f.out}` });
  console.log(`${OUT}/${f.out}`);
}
await browser.close();
