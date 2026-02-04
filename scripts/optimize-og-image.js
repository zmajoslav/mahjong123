/**
 * Optimize og-image for social sharing: 1200×630, compressed PNG.
 * Run: node scripts/optimize-og-image.js
 * Requires: npm install sharp (dev)
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const inputPath = path.join(publicDir, 'og-image.png');
const tempPath = path.join(publicDir, 'og-image.optimized.png');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Missing "sharp". Install with: npm install --save-dev sharp');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error('Not found:', inputPath);
    process.exit(1);
  }

  const statBefore = fs.statSync(inputPath);
  console.log('Input:', inputPath, `(${(statBefore.size / 1024 / 1024).toFixed(1)} MB)`);

  await sharp(inputPath)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'center' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(tempPath);

  const statAfter = fs.statSync(tempPath);
  const saved = ((1 - statAfter.size / statBefore.size) * 100).toFixed(1);
  console.log(`Optimized: ${(statAfter.size / 1024 / 1024).toFixed(1)} MB — ${saved}% smaller`);
  fs.renameSync(tempPath, inputPath);
  console.log('Replaced:', inputPath);
  console.log(`Dimensions: ${OG_WIDTH}×${OG_HEIGHT} (recommended for og:image)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
