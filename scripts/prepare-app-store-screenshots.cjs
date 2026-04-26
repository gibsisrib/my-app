/**
 * Resize phone screenshots to App Store Connect pixel sizes (cover crop, centered).
 *
 * Usage:
 *   1. Put PNG/JPEG screenshots in ./app-store-raw/ (any reasonable phone size).
 *   2. npm run prepare:screenshots
 *   3. Upload files from ./app-store-out/ in App Store Connect → Media Manager.
 *
 * Default: iPhone 6.9" portrait 1290 × 2796 (one of Apple's accepted sizes).
 * Optional: npm run prepare:screenshots -- --sizes=69-all
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const INPUT_DIR = path.join(ROOT, 'app-store-raw');
const OUTPUT_DIR = path.join(ROOT, 'app-store-out');

const SIZES_69_PORTRAIT = [
  { w: 1290, h: 2796 },
  { w: 1260, h: 2736 },
  { w: 1320, h: 2868 },
];

async function resizeCover(inputPath, outPath, width, height) {
  await sharp(inputPath)
    .rotate()
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();
}

async function main() {
  const all69 = process.argv.includes('--sizes=69-all');
  const targets = all69 ? SIZES_69_PORTRAIT : [SIZES_69_PORTRAIT[0]];

  const files = listImages(INPUT_DIR);
  if (files.length === 0) {
    console.error(`No images found in ${INPUT_DIR}`);
    console.error('Create that folder, drop your screenshots there, then run again.');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const file of files) {
    const base = path.basename(file, path.extname(file));
    const inPath = path.join(INPUT_DIR, file);
    for (const { w, h } of targets) {
      const outName = `${base}-${w}x${h}.png`;
      const outPath = path.join(OUTPUT_DIR, outName);
      await resizeCover(inPath, outPath, w, h);
      console.log('Wrote', outPath);
    }
  }

  console.log('\nDone. Upload the PNGs from app-store-out/ to App Store Connect.');
  console.log(
    'Tip: Crop Android navigation bars in your source shots first for a cleaner look.'
  );
  if (!all69) {
    console.log('Optional: npm run prepare:screenshots -- --sizes=69-all');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
