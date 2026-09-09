import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourcesDir = path.join(ROOT, "resources");

const jobs = [
  { src: "icon.svg", dst: "icon.png", size: 1024 },
  { src: "splash.svg", dst: "splash.png", size: 2732 },
];

for (const { src, dst, size } of jobs) {
  const svg = await fs.readFile(path.join(resourcesDir, src));
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(path.join(resourcesDir, dst));
  console.log(`✓ ${src} → ${dst} (${size}×${size})`);
}
