/**
 * Generate og-image for social sharing: 1200×630.
 * Centers the logo on a dark background.
 * Run: node scripts/generate-og-image.js
 * Requires: npm install sharp (dev)
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo.png');
const outputPath = path.join(publicDir, 'og-image.png');

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

  if (!fs.existsSync(logoPath)) {
    console.error('Logo not found:', logoPath);
    process.exit(1);
  }

  console.log('Generating OG image with logo:', logoPath);

  // Create a dark background with a subtle gradient or pattern
  // For simplicity, we'll use a solid dark color that matches the app theme
  const background = Buffer.from(
    `<svg width="${OG_WIDTH}" height="${OG_HEIGHT}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0c0a08;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#181410;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <text x="50%" y="85%" font-family="serif" font-size="60" fill="#f8fafc" text-anchor="middle" font-weight="bold">Mahjong Boss Solitaire</text>
      <text x="50%" y="93%" font-family="sans-serif" font-size="30" fill="#c4d4e8" text-anchor="middle">Play Free Online Mahjong</text>
    </svg>`
  );

  // Resize logo to fit nicely in the center
  const logoResized = await sharp(logoPath)
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      channels: 4,
      background: { r: 12, g: 10, b: 8, alpha: 1 }
    }
  })
  .composite([
    { input: background, top: 0, left: 0 },
    { input: logoResized, top: 80, left: (OG_WIDTH - 400) / 2 }
  ])
  .png()
  .toFile(outputPath);

  console.log('Generated:', outputPath);
  console.log(`Dimensions: ${OG_WIDTH}×${OG_HEIGHT} (recommended for og:image)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
