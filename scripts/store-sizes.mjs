/**
 * The screenshot sizes App Store Connect accepts for iPhone, and the CSS
 * viewport that produces each one at a 3x pixel ratio.
 *
 *   1320x2868, 1290x2796 — iPhone 6.9" slot
 *   1284x2778, 1242x2688 — iPhone 6.5" slot
 *
 * A slot takes its own sizes and nothing else: uploading a 6.9" image into the
 * 6.5" slot fails with "The dimensions of one or more screenshots are wrong."
 */
export const SIZES = {
  "1320x2868": { width: 440, height: 956 },
  "1290x2796": { width: 430, height: 932 },
  "1284x2778": { width: 428, height: 926 },
  "1242x2688": { width: 414, height: 896 },
};
