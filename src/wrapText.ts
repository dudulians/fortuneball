import { DIE_FONT, DIE_LETTER_SPACING_EM } from "./dieFont";
import { fitTextsInTriangle } from "./fitText";

/**
 * Breaks a user-typed option into 1–3 lines for the die face, choosing the
 * split that lets the text be largest inside the triangle.
 */
export function wrapForDie(text: string, maxLines = 3): string[] {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length === 1) return [words[0]];

  const T = 512;
  const opts = { topWidth: T, height: T * 0.866, font: DIE_FONT, letterSpacingEm: DIE_LETTER_SPACING_EM, maxFontSize: T * 0.2 };
  let best: string[] = [words.join(" ")];
  let bestSize = fitTextsInTriangle([best], opts);

  const consider = (lines: string[]) => {
    const size = fitTextsInTriangle([lines], opts);
    if (size > bestSize + 0.01) {
      bestSize = size;
      best = lines;
    }
  };

  // two lines: every split point
  for (let i = 1; i < words.length; i++) {
    consider([words.slice(0, i).join(" "), words.slice(i).join(" ")]);
  }
  // three lines
  if (maxLines >= 3 && words.length >= 3) {
    for (let i = 1; i < words.length - 1; i++) {
      for (let j = i + 1; j < words.length; j++) {
        consider([words.slice(0, i).join(" "), words.slice(i, j).join(" "), words.slice(j).join(" ")]);
      }
    }
  }
  return best;
}
