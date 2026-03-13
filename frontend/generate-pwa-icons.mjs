/**
 * generate-pwa-icons.mjs
 * Generates all required PWA icon sizes from pwa-icon.svg using sharp.
 * Run once: node generate-pwa-icons.mjs  (from frontend/)
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgBuffer = readFileSync(join(__dirname, 'public/pwa-icon.svg'));

const outputDir = join(__dirname, 'public/icons');
mkdirSync(outputDir, { recursive: true });

// Standard sizes required by browsers + manifest
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png({ compressionLevel: 9, quality: 90 })
    .toFile(join(outputDir, `pwa-${size}x${size}.png`));
  console.log(`✓ Generated pwa-${size}x${size}.png`);
}

// Maskable icon: same design but extra-padded (content within the safe 80% circle)
const maskableBuffer = readFileSync(join(__dirname, 'public/pwa-icon.svg'));
await sharp(maskableBuffer)
  .resize(512, 512)
  .png({ compressionLevel: 9, quality: 90 })
  .toFile(join(outputDir, 'maskable-512x512.png'));
console.log('✓ Generated maskable-512x512.png');

// Apple-touch-icon (180×180, no rounded corners — iOS applies its own mask)
await sharp(svgBuffer)
  .resize(180, 180)
  .png({ compressionLevel: 9, quality: 90 })
  .toFile(join(__dirname, 'public/apple-touch-icon.png'));
console.log('✓ Generated apple-touch-icon.png (180x180)');

console.log('\nAll PWA icons generated successfully!');
