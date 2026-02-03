/**
 * Build script: generates language-specific index.html and privacy/terms pages
 * Run: node scripts/build-i18n.js
 */
const fs = require('fs');
const path = require('path');
const translations = require('../src/i18n/translations');

const publicDir = path.join(__dirname, '..', 'public');
const langs = ['en', 'es', 'fr', 'de', 'pt', 'pl', 'it'];

function getReplacementMap(lang) {
  const t = translations[lang] || translations.en;
  return [
    ['Mahjong Boss – Free Mahjong Solitaire Online | No Download, Daily Challenge', t.meta.title],
    ['Play Mahjong Solitaire free online. 8 layouts, Daily Challenge, auto-hints & leaderboard. No download—play in your browser on desktop, tablet & mobile. Start now!', t.meta.description],
    ['Match the pairs. Pick your level. Play free.', t.landing.tagline],
    ['8 layouts & Daily Challenge', t.landing.feature1],
    ['Auto-hints when you\'re stuck', t.landing.feature2],
    ['No download – play in browser', t.landing.feature3],
    ['Leaderboard & high scores', t.landing.feature4],
    ['Play Now', t.landing.playNow],
    ['Daily Challenge', t.layouts.daily],
    ['Level 1 (24 tiles)', t.layouts.supereasy],
    ['Level 2 (48 tiles)', t.layouts.easy],
    ['Level 3 (72 tiles)', t.layouts.turtle],
    ['Level 4 (80 tiles)', t.layouts.pyramid],
    ['Level 5 (104 tiles)', t.layouts.hard],
    ['Fort (80 tiles)', t.layouts.fort],
    ['Caterpillar (72 tiles)', t.layouts.caterpillar],
    ['Highlight playable', t.ui.highlightPlayable],
    ['New deal', t.ui.newDeal],
    ['Center', t.ui.center],
    ['Undo', t.ui.undo],
    ['Shuffle', t.ui.shuffle],
    ['Hint', t.ui.hint],
    ['Menu', t.ui.menu],
    ['Help', t.ui.help],
    ['Statistics', t.ui.statistics],
    ['Leaderboard', t.ui.leaderboard],
    ['Refresh', t.ui.refresh],
    ['Loading Mahjong...', t.ui.loading],
    ["It's a single-player tile-matching puzzle. Match pairs of identical tiles to clear the board. Also called Shanghai Solitaire.", t.faq.whatIs],
    [' pairs', ' ' + t.ui.pairs],
    [' tiles', ' ' + t.ui.tiles],
    ['Close', t.ui.close],
    ['Privacy', t.footer.privacy],
    ['Terms', t.footer.terms],
  ];
}

function replaceInHtml(html, lang) {
  const map = getReplacementMap(lang);
  let out = html;
  for (const [from, to] of map) {
    out = out.split(from).join(to);
  }
  return out;
}

function setHreflang(html, lang) {
  const base = 'https://mahjongboss.com';
  const alternateLines = langs.map((l) => {
    const url = l === 'en' ? base + '/' : base + '/' + l + '/';
    return `  <link rel="alternate" hreflang="${l}" href="${url}">`;
  }).join('\n');
  const xDefault = lang === 'en' ? base + '/' : base + '/';
  const hreflangBlock = alternateLines + '\n  <link rel="alternate" hreflang="x-default" href="' + base + '/">';
  if (html.includes('<link rel="canonical"')) {
    html = html.replace(
      /<link rel="canonical" href="[^"]*">/,
      '<link rel="canonical" href="' + (lang === 'en' ? base + '/' : base + '/' + lang + '/') + '">\n' + hreflangBlock
    );
  }
  return html;
}

function setLangAttr(html, lang) {
  return html
    .replace(/<html lang="en">/, '<html lang="' + lang + '" data-lang="' + lang + '">');
}

function main() {
  const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

  for (const lang of langs) {
    let html = indexHtml;
    if (lang !== 'en') {
      html = replaceInHtml(html, lang);
      html = setLangAttr(html, lang);
      html = setHreflang(html, lang);
      const dir = path.join(publicDir, lang);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
      console.log('Generated ' + lang + '/index.html');
    }
  }

  // Add hreflang to English index
  let enHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  if (!enHtml.includes('hreflang')) {
    enHtml = setHreflang(enHtml, 'en');
    enHtml = enHtml.replace('<html lang="en">', '<html lang="en" data-lang="en">');
    fs.writeFileSync(path.join(publicDir, 'index.html'), enHtml, 'utf8');
    console.log('Updated index.html with hreflang');
  }

  console.log('i18n build complete.');
}

main();
