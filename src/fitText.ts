/**
 * Fits text inside a downward-pointing triangle (the die face).
 *
 * The triangle has top width `topWidth` and height `height` (px). Lower lines
 * get less room because the triangle narrows. Glyph widths are measured with
 * a canvas, so the result is exact for any font and alphabet.
 *
 * All answers share ONE font size — like letters moulded into a real die —
 * so the size is solved for the whole set (`fitTextsInTriangle`) and each
 * answer's block is then placed with `placeBlock`.
 */

export interface FitFont {
  family: string; // e.g. `"Jost", sans-serif`
  weight: number | string;
}

export interface TriangleFitOptions {
  topWidth: number;
  height: number;
  font: FitFont;
  letterSpacingEm?: number;
  maxFontSize: number;
}

export interface TriangleFit {
  fontSize: number;
  lineHeight: number; // px
  top: number; // px from the triangle's top edge to the block's top
}

const LINE_HEIGHT = 1.04; // × font size (uppercase only)
const TOP_MARGIN = 0.17; // × height — nothing above this line
const BOTTOM_LIMIT = 0.82; // × height — nothing below this line
const SIDE_MARGIN = 0.82; // usable share of the local triangle width
const BLOCK_CENTER = 0.4; // × height — where a block wants its middle

let canvas: HTMLCanvasElement | null = null;

export function fontString(font: FitFont, sizePx: number, style = ""): string {
  return `${style ? style + " " : ""}${font.weight} ${sizePx}px ${font.family}`;
}

function measureAt1px(line: string, font: FitFont, letterSpacingEm: number): number {
  if (!canvas) canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return line.length * 0.6;
  ctx.font = fontString(font, 100);
  const w = ctx.measureText(line).width / 100;
  return w + letterSpacingEm * Math.max(0, line.length - 1);
}

/** Vertical placement of an n-line block at a given font size. */
export function placeBlock(lineCount: number, fontSize: number, height: number): { top: number; lineHeight: number } {
  const lineHeight = fontSize * LINE_HEIGHT;
  const blockH = lineCount * lineHeight;
  const wanted = BLOCK_CENTER * height - blockH / 2;
  const top = Math.max(TOP_MARGIN * height, Math.min(wanted, BOTTOM_LIMIT * height - blockH));
  return { top, lineHeight };
}

function textFits(widths1px: number[], fontSize: number, opts: TriangleFitOptions): boolean {
  const { topWidth: T, height: H } = opts;
  const { top, lineHeight } = placeBlock(widths1px.length, fontSize, H);
  if (top + widths1px.length * lineHeight > BOTTOM_LIMIT * H + 0.01) return false;
  for (let i = 0; i < widths1px.length; i++) {
    const yc = top + (i + 0.5) * lineHeight;
    const avail = SIDE_MARGIN * T * (1 - yc / H);
    if (widths1px[i] * fontSize > avail) return false;
  }
  return true;
}

/** Largest font size at which EVERY text in the set fits. */
export function fitTextsInTriangle(texts: string[][], opts: TriangleFitOptions): number {
  const ls = opts.letterSpacingEm ?? 0;
  const measured = texts.map((lines) => lines.map((l) => measureAt1px(l, opts.font, ls)));

  let lo = 4;
  let hi = Math.max(4, opts.maxFontSize);
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (measured.every((w) => textFits(w, mid, opts))) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo * 10) / 10;
}

/** Single-text convenience: size for this text alone, plus its placement. */
export function fitInTriangle(lines: string[], opts: TriangleFitOptions): TriangleFit {
  const fontSize = fitTextsInTriangle([lines], opts);
  return { fontSize, ...placeBlock(lines.length, fontSize, opts.height) };
}
