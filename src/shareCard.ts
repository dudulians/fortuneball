import type { Answer, Lang, Rarity, Tone } from "./answers";
import { ANSWERS, answerText, sizedOnItsOwn } from "./answers";
import { BALL_ANSWER_SRC, DIE_FONT, DIE_LETTER_SPACING_EM } from "./Ball";
import { fitTextsInTriangle, fontString, placeBlock } from "./fitText";
import { t } from "./i18n";

const W = 1080;
const H = 1920;

type ToneKey = Tone | Rarity;

export const GLOW: Record<ToneKey, string> = {
  positive: "79,120,255",
  neutral: "150,110,255",
  negative: "120,70,200",
  golden: "236,186,80",
  cosmic: "178,130,255",
};

const DIE_COLORS: Record<ToneKey, [string, string, string, string]> = {
  positive: ["#3f68d2", "#2c4cb4", "#1f378f", "#182c76"],
  neutral: ["#5b5fd6", "#4345b8", "#303292", "#26287a"],
  negative: ["#3549bf", "#26389c", "#1b287a", "#152064"],
  golden: ["#f0c65a", "#d9a437", "#b07f1e", "#7a5510"],
  cosmic: ["#a98cff", "#7f62e8", "#5a3fc0", "#3b2790"],
};

function toneKey(a: Answer): ToneKey {
  return a.rarity ?? a.tone;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${src}`));
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
    cut[maxLines - 1] = `${last}…`;
    return cut;
  }
  return lines;
}

export interface AccuracyCardInput {
  percent: number;
  hits: number;
  checked: number;
  lang: Lang;
}

/** "My Fortune Ball is right 73% of the time" — a story card for the accuracy stat. */
export async function renderAccuracyCard({ percent, hits, checked, lang }: AccuracyCardInput): Promise<Blob> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  await fonts?.load(`700 40px "Manrope"`).catch(() => []);
  const ball = await loadImage(BALL_ANSWER_SRC);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");

  ctx.fillStyle = "#06060a";
  ctx.fillRect(0, 0, W, H);
  const spot = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, W * 0.95);
  spot.addColorStop(0, "#1b1b33");
  spot.addColorStop(0.55, "#0d0d19");
  spot.addColorStop(1, "#06060a");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(241,238,232,0.45)";
  ctx.font = `700 34px "Manrope", Arial, sans-serif`;
  drawSpaced(ctx, t(lang, "shareFooter"), W / 2, 200, 14);

  ctx.fillStyle = "rgba(241,238,232,0.7)";
  ctx.font = `500 48px "Manrope", Arial, sans-serif`;
  ctx.fillText(t(lang, "shareAccuracyTitle"), W / 2, 520);

  ctx.fillStyle = "#f1eee8";
  ctx.font = `700 300px "Manrope", Arial, sans-serif`;
  ctx.fillText(`${percent}%`, W / 2, 760);

  ctx.fillStyle = "rgba(241,238,232,0.7)";
  ctx.font = `500 48px "Manrope", Arial, sans-serif`;
  ctx.fillText(t(lang, "shareAccuracyOfTime"), W / 2, 970);

  ctx.fillStyle = "rgba(241,238,232,0.45)";
  ctx.font = `500 36px "Manrope", Arial, sans-serif`;
  ctx.fillText(`${hits} ${t(lang, "of")} ${checked} · ${t(lang, "shareAccuracyChecked")}`, W / 2, 1050);

  const size = 420;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 30;
  ctx.drawImage(ball, W / 2 - size / 2, 1180, size, size);
  ctx.restore();

  ctx.fillStyle = "rgba(241,238,232,0.4)";
  ctx.font = `500 36px "Manrope", Arial, sans-serif`;
  ctx.fillText(t(lang, "shareTagline"), W / 2, 1720);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92);
  });
}

function drawSpaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const chars = text.split("");
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

function triangle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.closePath();
}

/** Draws the live window (liquid + die + text) over the render, same geometry as the CSS. */
function drawWindow(ctx: CanvasRenderingContext2D, cx: number, cy: number, ballSize: number, answer: Answer, lang: Lang) {
  const wcx = cx;
  const wcy = cy - ballSize * 0.004;
  const wr = ballSize * 0.224;

  ctx.save();
  ctx.beginPath();
  ctx.arc(wcx, wcy, wr, 0, Math.PI * 2);
  ctx.clip();

  const liquid = ctx.createRadialGradient(wcx, wcy - wr * 0.16, wr * 0.02, wcx, wcy, wr);
  liquid.addColorStop(0, "#08113a");
  liquid.addColorStop(0.42, "#040a26");
  liquid.addColorStop(0.78, "#010313");
  liquid.addColorStop(1, "#000000");
  ctx.fillStyle = liquid;
  ctx.fillRect(wcx - wr, wcy - wr, wr * 2, wr * 2);

  // Die — same geometry as .die in App.css: face + neighbouring facets
  const T = wr * 2 * 0.7;
  const Hh = T * 0.866;
  const tx = wcx - T / 2;
  const ty = wcy - wr + wr * 2 * 0.24;
  const [c0, c1, c2, c3] = DIE_COLORS[toneKey(answer)];

  // Neighbouring facets (blurred, dark, lit at the shared edge)
  ctx.save();
  ctx.filter = "blur(4px)";
  // top
  let g = ctx.createLinearGradient(0, ty, 0, ty - Hh * 0.46);
  g.addColorStop(0, "rgba(64,96,200,0.6)");
  g.addColorStop(0.45, "rgba(22,38,110,0.32)");
  g.addColorStop(1, "rgba(4,8,36,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + T, ty);
  ctx.lineTo(wcx, ty - Hh * 0.46);
  ctx.closePath();
  ctx.fill();
  // left
  g = ctx.createLinearGradient(tx + T * 0.25, ty + Hh * 0.5, tx - T * 0.47, ty + Hh * 0.66);
  g.addColorStop(0, "rgba(52,80,180,0.55)");
  g.addColorStop(0.5, "rgba(14,26,84,0.3)");
  g.addColorStop(1, "rgba(3,6,30,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(wcx, ty + Hh);
  ctx.lineTo(tx - T * 0.47, ty + Hh * 0.66);
  ctx.closePath();
  ctx.fill();
  // right
  g = ctx.createLinearGradient(tx + T * 0.75, ty + Hh * 0.5, tx + T * 1.47, ty + Hh * 0.66);
  g.addColorStop(0, "rgba(52,80,180,0.55)");
  g.addColorStop(0.5, "rgba(14,26,84,0.3)");
  g.addColorStop(1, "rgba(3,6,30,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(tx + T, ty);
  ctx.lineTo(wcx, ty + Hh);
  ctx.lineTo(tx + T * 1.47, ty + Hh * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Rim (lit top edge, dark slants)
  const rim = ctx.createLinearGradient(0, ty, 0, ty + Hh);
  rim.addColorStop(0, "rgba(170,196,255,0.8)");
  rim.addColorStop(0.1, "rgba(96,126,224,0.4)");
  rim.addColorStop(1, "rgba(12,22,74,0.7)");
  ctx.fillStyle = rim;
  triangle(ctx, tx, ty, T, Hh);
  ctx.fill();

  // Face
  const ex = T * 0.019;
  const ey = Hh * 0.017;
  // deep colour behind the letters, lighter towards the edges (same as the shader)
  const face = ctx.createRadialGradient(wcx, ty + Hh * 0.36, 0, wcx, ty + Hh * 0.36, T * 0.62);
  face.addColorStop(0, c3);
  face.addColorStop(0.45, c2);
  face.addColorStop(0.8, c1);
  face.addColorStop(1, c0);
  ctx.fillStyle = face;
  triangle(ctx, tx + ex, ty + ey, T - ex * 2, Hh - ey - Hh * 0.028);
  ctx.fill();

  // Text — same solver as the app: one size for every built-in answer, own size for a typed option.
  const lines = answerText(answer, lang).split("\n");
  const fitOpts = { topWidth: T, height: Hh, font: DIE_FONT, letterSpacingEm: DIE_LETTER_SPACING_EM, maxFontSize: T * 0.2 };
  const shared = fitTextsInTriangle(ANSWERS.map((a) => answerText(a, lang).split("\n")), fitOpts);
  const fontSize = sizedOnItsOwn(answer) ? Math.min(shared, fitTextsInTriangle([lines], fitOpts)) : shared;
  const fit = { fontSize, ...placeBlock(lines.length, fontSize, Hh) };
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = fontString(DIE_FONT, fit.fontSize);
  const spacing = fit.fontSize * DIE_LETTER_SPACING_EM;
  lines.forEach((l, i) => {
    const y = ty + fit.top + (i + 0.5) * fit.lineHeight;
    // moulded letters: light lip above, shadow below, then the letter itself
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    drawSpaced(ctx, l, wcx, y - 1.5, spacing);
    ctx.fillStyle = "rgba(0,0,40,0.7)";
    drawSpaced(ctx, l, wcx, y + 1.5, spacing);
    ctx.fillStyle = "#d9e4ff";
    drawSpaced(ctx, l, wcx, y, spacing);
  });

  // Glass reflection
  const glass = ctx.createRadialGradient(wcx - wr * 0.3, wcy - wr * 0.68, 0, wcx - wr * 0.3, wcy - wr * 0.68, wr * 0.9);
  glass.addColorStop(0, "rgba(255,255,255,0.13)");
  glass.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glass;
  ctx.fillRect(wcx - wr, wcy - wr, wr * 2, wr * 2);

  // Inner shadow at the top of the window
  const inner = ctx.createLinearGradient(0, wcy - wr, 0, wcy - wr * 0.35);
  inner.addColorStop(0, "rgba(0,0,0,0.85)");
  inner.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = inner;
  ctx.fillRect(wcx - wr, wcy - wr, wr * 2, wr * 2);

  ctx.restore();
}

export interface ShareCardInput {
  question: string;
  answer: Answer;
  lang: Lang;
}

/** Renders a 1080x1920 story card and returns it as a JPEG blob. */
export async function renderShareCard({ question, answer, lang }: ShareCardInput): Promise<Blob> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  await Promise.all([
    fonts?.load(fontString(DIE_FONT, 40)).catch(() => []),
    fonts?.load(`600 40px "Cormorant Garamond"`).catch(() => []),
    fonts?.load(`italic 500 40px "Cormorant Garamond"`).catch(() => []),
  ]);
  const ball = await loadImage(BALL_ANSWER_SRC);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");

  // Background: spotlight over near-black
  ctx.fillStyle = "#06060a";
  ctx.fillRect(0, 0, W, H);
  const spot = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, W * 0.95);
  spot.addColorStop(0, "#1b1b33");
  spot.addColorStop(0.55, "#0d0d19");
  spot.addColorStop(1, "#06060a");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, H * 0.56, 0, W / 2, H * 0.56, W * 0.62);
  glow.addColorStop(0, `rgba(${GLOW[toneKey(answer)]},0.3)`);
  glow.addColorStop(1, `rgba(${GLOW[toneKey(answer)]},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Wordmark
  ctx.fillStyle = "rgba(241,238,232,0.45)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 34px "Cormorant Garamond", Georgia, serif`;
  drawSpaced(ctx, t(lang, "shareFooter"), W / 2, 200, 16);

  // Question
  const q = question.trim();
  if (q) {
    ctx.fillStyle = "#f1eee8";
    ctx.font = `italic 500 64px "Cormorant Garamond", Georgia, serif`;
    const lines = wrap(ctx, `“${q}”`, W - 180, 3);
    const lh = 78;
    const startY = 400 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lh));
  }

  // Ball render + shadow
  const size = 760;
  const bx = W / 2 - size / 2;
  const by = 1080 - size / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 40;
  ctx.drawImage(ball, bx, by, size, size);
  ctx.restore();
  drawWindow(ctx, W / 2, by + size / 2, size, answer, lang);

  // Tagline
  ctx.fillStyle = "rgba(241,238,232,0.4)";
  ctx.font = `italic 500 40px "Cormorant Garamond", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText(t(lang, "shareTagline"), W / 2, 1720);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92);
  });
}
