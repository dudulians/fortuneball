/**
 * Builds the App Store icon from a cut-out of the app's own ball.
 *
 * The cut-out (`resources/ball-cutout.png`) is a screenshot of the live ball —
 * photoreal sphere, steel bezel, blue die — taken from the running app, so the
 * icon can never drift away from what the app actually shows. This script only
 * masks the sphere out of it and sets it on the app's backdrop.
 *
 *   node scripts/make-icon.mjs [cutout.png] [out.png] [ball share of the icon, 0.8]
 */
import sharp from "sharp";

const SRC = process.argv[2] ?? "resources/ball-cutout.png";
const OUT = process.argv[3] ?? "resources/icon.png";
const ZOOM = Number(process.argv[4] ?? 0.8); // sphere diameter as a share of the icon; >1 bleeds off the edges
const S = 1024; // App Store icon, one size, no alpha, no rounded corners

const src = sharp(SRC);
const { width } = await src.metadata();

// The cut-out is square with the sphere centred; the halo around it is trimmed
// off by a circular mask so it cannot band against the icon's own background.
const R = Math.round(width * 0.408); // sphere radius inside the cut-out
const mask = Buffer.from(
  `<svg width="${width}" height="${width}"><circle cx="${width / 2}" cy="${width / 2}" r="${R}" fill="#fff"/></svg>`
);
const BALL = Math.round(S * ZOOM);
// Two passes: sharp runs extract/resize before composite inside one pipeline,
// so the mask has to land on the full-size cut-out first.
const maskPng = await sharp(mask).resize(width, width).png().toBuffer();
const masked = await sharp(SRC).composite([{ input: maskPng, blend: "dest-in" }]).png().toBuffer();
const ball = await sharp(masked)
  .extract({
    left: Math.round(width / 2 - R),
    top: Math.round(width / 2 - R),
    width: R * 2,
    height: R * 2,
  })
  .resize(BALL, BALL)
  .png()
  .toBuffer();

// Backdrop: the app's own spotlight, plus the blue the die throws into the room.
const bg = Buffer.from(`<svg width="${S}" height="${S}">
  <defs>
    <radialGradient id="room" cx="50%" cy="38%" r="78%">
      <stop offset="0%" stop-color="#20203c"/>
      <stop offset="55%" stop-color="#0e0e1c"/>
      <stop offset="100%" stop-color="#06060a"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4f78ff" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="#4f78ff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#4f78ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#room)"/>
  <circle cx="${S / 2}" cy="${S * 0.5}" r="${S * 0.47}" fill="url(#glow)"/>
</svg>`);

// Past ZOOM 1 the sphere is wider than the icon: crop it back to the frame
// rather than let it hang off the edges, which composite will not do.
const over = BALL > S;
const layer = over
  ? await sharp(ball)
      .extract({ left: Math.round((BALL - S) / 2), top: Math.round((BALL - S) / 2), width: S, height: S })
      .png()
      .toBuffer()
  : ball;

await sharp(bg)
  .composite([{ input: layer, left: over ? 0 : Math.round((S - BALL) / 2), top: over ? 0 : Math.round((S - BALL) / 2) }])
  .flatten({ background: "#06060a" })
  .removeAlpha() // the App Store refuses an icon that still carries an alpha channel
  .png()
  .toFile(OUT);

console.log(`${OUT} — ${S}x${S}, ball ${BALL}px`);
