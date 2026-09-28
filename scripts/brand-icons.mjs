// Regenerates PNG icons (PWA, Apple touch, email header) from public/brand/logo.svg.
// Run after replacing the logo: npm run brand:icons
import sharp from "sharp";

const src = "public/brand/logo.svg";
const out = [
  ["public/brand/icon-192.png", 192],
  ["public/brand/icon-512.png", 512],
  ["public/brand/logo-email.png", 144],
  ["src/app/apple-icon.png", 180],
  ["src/app/icon.png", 64],
];
for (const [file, size] of out) {
  await sharp(src, { density: 600 }).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
// Maskable icon: logo on a solid square with safe-zone padding.
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0b6b3a" } })
  .composite([{ input: await sharp(src, { density: 600 }).resize(400, 400).png().toBuffer(), gravity: "center" }])
  .png()
  .toFile("public/brand/icon-maskable-512.png");
console.log("wrote public/brand/icon-maskable-512.png");
