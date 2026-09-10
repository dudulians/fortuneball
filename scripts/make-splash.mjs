/**
 * The launch screen, built from the same ball cut-out as the icon.
 *
 * The storyboard shows this image with scaleAspectFill on a square canvas, so
 * only the middle strip is ever visible on a phone: on a 1170x2532 screen that
 * is about 1260 px of the 2732. The ball is sized against that strip, not
 * against the canvas — the generated file the Capacitor assets tool left behind
 * had a 190 px logo on a 2732 px field, which came out as a stamp in the middle
 * of a black screen.
 *
 *   node scripts/make-splash.mjs
 *
 * Writes every Default@*.png in ios/App/App/Assets.xcassets/Splash.imageset.
 * Light and dark are the same file: the app is dark either way.
 */
import sharp from "sharp";
import { writeFileSync } from "fs";

const SRC = "resources/ball-cutout.png";
const OUT = "ios/App/App/Assets.xcassets/Splash.imageset";
const S = 2732;
/** Roughly the ball on the intro screen, so the splash hands over to it quietly. */
const BALL = 460;

const { width } = await sharp(SRC).metadata();
const R = Math.round(width * 0.408); // the sphere inside the cut-out
const mask = await sharp(
  Buffer.from(`<svg width="${width}" height="${width}"><circle cx="${width / 2}" cy="${width / 2}" r="${R}" fill="#fff"/></svg>`)
)
  .resize(width, width)
  .png()
  .toBuffer();

const masked = await sharp(SRC).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
const ball = await sharp(masked)
  .extract({ left: Math.round(width / 2 - R), top: Math.round(width / 2 - R), width: R * 2, height: R * 2 })
  .resize(BALL, BALL)
  .png()
  .toBuffer();

// The app's own backdrop, so the first frame of the app is the same room.
const bg = Buffer.from(`<svg width="${S}" height="${S}">
  <defs>
    <radialGradient id="room" cx="50%" cy="46%" r="62%">
      <stop offset="0%" stop-color="#1b1b33"/>
      <stop offset="55%" stop-color="#0d0d19"/>
      <stop offset="100%" stop-color="#06060a"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#room)"/>
</svg>`);

const splash = await sharp(bg)
  .composite([{ input: ball, left: Math.round((S - BALL) / 2), top: Math.round((S - BALL) / 2) }])
  .flatten({ background: "#06060a" })
  .removeAlpha()
  .png()
  .toBuffer();

for (const scale of [1, 2, 3]) {
  for (const suffix of ["", "-dark"]) {
    const name = `Default@${scale}x~universal~anyany${suffix}.png`;
    writeFileSync(`${OUT}/${name}`, splash);
    console.log(`${OUT}/${name} — ${S}x${S}, ball ${BALL}px`);
  }
}
