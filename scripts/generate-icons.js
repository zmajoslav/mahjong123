/**
 * Generate favicon and mobile icons from logo.png.
 * Run: node scripts/generate-icons.js
 * Requires: npm install sharp (dev)
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo.png');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Missing "sharp". Install with: npm install --save-dev sharp');
    process.exit(1);
  }

  if (!fs.existsSync(logoPath)) {
    console.error('Logo not found:', logoPath);
    process.exit(1);
  }

  console.log('Generating icons from:', logoPath);

  // 1. Favicon (32x32)
  await sharp(logoPath)
    .resize(32, 32)
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated: favicon.png');

  // 2. Apple Touch Icon (180x180)
  await sharp(logoPath)
    .resize(180, 180)
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated: apple-touch-icon.png');

  // 3. Android Chrome Icons (192x192 and 512x512)
  await sharp(logoPath)
    .resize(192, 192)
    .toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(logoPath)
    .resize(512, 512)
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Generated: icon-192.png, icon-512.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
