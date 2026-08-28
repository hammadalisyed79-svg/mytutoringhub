import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const markSvg = readFileSync(join(root, "public/logo.svg"), "utf8");

const markInner = markSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="320" viewBox="0 0 1200 320">
  <rect width="1200" height="320" fill="#F7F3EA"/>
  <g transform="translate(48, 48) scale(3.5)">${markInner}</g>
  <text x="300" y="188" font-family="Georgia, 'Times New Roman', serif" font-size="88" font-weight="700">
    <tspan fill="#064236">My Tutoring </tspan><tspan fill="#9a4518">Hub</tspan>
  </text>
</svg>`;

const outputs = [
  {
    file: "public/logo-mark-512.jpg",
    input: markSvg,
    width: 512,
    height: 512,
    background: "#F7F3EA",
  },
  {
    file: "public/logo-mark-1024.jpg",
    input: markSvg,
    width: 1024,
    height: 1024,
    background: "#F7F3EA",
  },
  {
    file: "public/logo-full-1200.jpg",
    input: fullSvg,
    width: 1200,
    height: 320,
    background: "#F7F3EA",
  },
];

for (const item of outputs) {
  const pipeline = sharp(Buffer.from(item.input)).resize(item.width, item.height, {
    fit: "contain",
    background: item.background,
  });
  await pipeline.jpeg({ quality: 92, mozjpeg: true }).toFile(join(root, item.file));
  console.log(`Wrote ${item.file}`);
}
