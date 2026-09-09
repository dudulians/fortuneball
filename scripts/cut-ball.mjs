// Cuts the photoreal ball renders out of their fake-checkerboard background:
// crops a circle around the sphere, adds an anti-aliased alpha edge and
// writes WebP with transparency to public/ball-*.webp.
//
// Circle geometry was measured from the pixels (see PLAN.md, session 1b).
import sharp from "sharp";

const OUT = 1024;
const JOBS = [
  { src: "public/ball-idle.png", out: "public/ball-idle.webp", cx: 626.5, cy: 580, r: 433.5 },
  { src: "public/ball-answer.png", out: "public/ball-answer.webp", cx: 621.5, cy: 584.5, r: 409.5 },
];

for (const j of JOBS) {
  const r = j.r - 5; // stay inside the light fringe of the checkerboard
  const left = Math.round(j.cx - r);
  const top = Math.round(j.cy - r);
  const side = Math.round(r * 2);

  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT}" height="${OUT}">
       <defs>
         <radialGradient id="g" cx="50%" cy="50%" r="50%">
           <stop offset="0" stop-color="#fff"/>
           <stop offset="0.985" stop-color="#fff"/>
           <stop offset="1" stop-color="#000"/>
         </radialGradient>
       </defs>
       <rect width="100%" height="100%" fill="#000"/>
       <circle cx="${OUT / 2}" cy="${OUT / 2}" r="${OUT / 2}" fill="url(#g)"/>
     </svg>`
  );

  const rgb = await sharp(j.src)
    .extract({ left, top, width: side, height: side })
    .resize(OUT, OUT, { kernel: "lanczos3" })
    .removeAlpha()
    .toBuffer();

  const alpha = await sharp(mask).resize(OUT, OUT).greyscale().raw().toBuffer();

  await sharp(rgb)
    .joinChannel(alpha, { raw: { width: OUT, height: OUT, channels: 1 } })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(j.out);

  const meta = await sharp(j.out).metadata();
  console.log(`${j.out}: ${meta.width}x${meta.height} hasAlpha=${meta.hasAlpha}`);
}
