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
    // Meta & OG & Twitter (long first)
    ['Play Mahjong Solitaire free online. 8 layouts, Daily Challenge, auto-hints & leaderboard. No download—play in your browser on desktop, tablet & mobile. Start now!', t.meta.description],
    ['Play Mahjong Solitaire free online. 8 layouts, Daily Challenge, auto-hints & leaderboard. No download—play in browser on any device.', t.og.description],
    ['Play Mahjong Solitaire free online. 8 layouts, Daily Challenge, auto-hints & leaderboard. No download.', t.twitter.description],
    ['Free online Mahjong Solitaire (Shanghai Solitaire). 8 layouts, Daily Challenge, auto-hints & leaderboard. No download—play in browser.', t.schema.description],
    ['Mahjong Boss – Free Mahjong Solitaire Online | No Download, Daily Challenge', t.meta.title],
    ['<meta name="keywords" content="mahjong solitaire, free mahjong solitaire, shanghai mahjong, shanghai solitaire, tile matching game, free mahjong no download, mahjong daily challenge, mahjong puzzle, online mahjong, mahjong with hints, mahjong leaderboard, brain game, matching game">', '<meta name="keywords" content="' + t.meta.keywords.replace(/"/g, '&quot;') + '">'],
    ['Free Mahjong Solitaire – Daily Challenge, Hints & Leaderboard', t.og.title],
    ['Free Mahjong Solitaire – Daily Challenge & Leaderboard', t.twitter.title],
    // A11y (before UI text so e.g. "Highlight playable tiles" isn't broken by "Highlight playable")
    ['aria-label="Layout"', 'aria-label="' + t.a11y.layout + '"'],
    ['aria-label="Highlight playable tiles"', 'aria-label="' + t.a11y.highlightPlayable + '"'],
    ['title="Sound"', 'title="' + t.a11y.sound + '"'],
    ['aria-label="Mute sound"', 'aria-label="' + t.a11y.muteSound + '"'],
    ['title="Progress"', 'title="' + t.a11y.progress + '"'],
    ['title="Elapsed time"', 'title="' + t.a11y.elapsedTime + '"'],
    ['title="Score"', 'title="' + t.a11y.score + '"'],
    ['title="Possible pairs"', 'title="' + t.a11y.possiblePairs + '"'],
    ['aria-label="Loading game"', 'aria-label="' + t.a11y.loadingGame + '"'],
    ['aria-label="Open menu"', 'aria-label="' + t.a11y.openMenu + '"'],
    ['aria-label="Close sidebar"', 'aria-label="' + t.a11y.closeSidebar + '"'],
    ['aria-label="Game board area. Drag to move around."', 'aria-label="' + t.a11y.boardArea + '"'],
    ['aria-label="New game"', 'aria-label="' + t.a11y.newGame + '"'],
    ['aria-label="Center board view"', 'aria-label="' + t.a11y.centerBoard + '"'],
    ['aria-label="Undo"', 'aria-label="' + t.a11y.undo + '"'],
    ['aria-label="Shuffle"', 'aria-label="' + t.a11y.shuffle + '"'],
    ['aria-label="Hint"', 'aria-label="' + t.a11y.hint + '"'],
    ['aria-label="Play game"', 'aria-label="' + t.a11y.playGame + '"'],
    // FAQ Schema (full Q&A)
    ['Yes! Mahjong Boss works on all devices including desktop, tablet, and mobile phones. No app download needed - just play in your browser.', t.faq.q5Text],
    ['Click two identical tiles (same design) that are not blocked by others. Tiles must be free on the left or right and have nothing on top. Clear all tiles to win!', t.faq.q4Text],
    ['Yes! Play the Daily Challenge—the same layout and tiles for everyone each day. Compete on the leaderboard with the same puzzle.', t.faq.q3Text],
    ['Yes! Mahjong Boss is completely free to play with no download or sign-up required. Enter your name after winning to save to the leaderboard.', t.faq.q2Text],
    ['Mahjong Solitaire is a single-player tile-matching puzzle game. Match pairs of identical tiles to clear the board. Also called Shanghai Solitaire.', t.faq.q1Text],
    ['Can I play Mahjong Solitaire on mobile?', t.faq.q5Name],
    ['How do I play Mahjong Solitaire?', t.faq.q4Name],
    ['Does Mahjong Boss have a Daily Challenge?', t.faq.q3Name],
    ['Is Mahjong Boss free to play?', t.faq.q2Name],
    ['What is Mahjong Solitaire?', t.faq.q1Name],
    // Landing SEO paragraphs
    ['<strong>What is the Daily Challenge?</strong> The same layout and tiles for everyone each day. Everyone plays the same puzzle—compete on the leaderboard!', t.seo.faqDaily],
    ['<strong>How do I save my score?</strong> After winning, enter your name and click "Save to leaderboard" in the win screen. No sign-up required.', t.seo.faqSaveScore],
    ['<strong>Is it free?</strong> Yes. Play as much as you like with no download or sign-up required. Register to save high scores and appear on the leaderboard.', t.seo.faqFree],
    ['<strong>What is Mahjong Solitaire?</strong> It\'s a single-player tile-matching puzzle. Match pairs of identical tiles to clear the board. Also called Shanghai Solitaire.', t.seo.faqWhatIs],
    ['<strong>Features:</strong> No download required—play directly in your browser on desktop, tablet, or mobile. <strong>Mahjong with hints</strong>: auto-hints help when you\'re stuck. Undo moves, shuffle tiles, or compete on the <strong>mahjong leaderboard</strong>. Large, easy-to-read tiles make this <strong>free mahjong puzzle</strong> ideal for relaxed play.', t.seo.p3],
    ['<strong>How to play:</strong> Click two <strong>identical</strong> tiles (same design) that are not blocked by others. Tiles must be free on the left or right and have nothing on top. Each flower matches only the same flower; each season matches only the same season. Clear all tiles to win!', t.seo.p2],
    ['Play <strong>Mahjong Solitaire</strong> (also called <strong>Shanghai Solitaire</strong>) online for free. This classic <strong>Shanghai Mahjong</strong> tile matching puzzle challenges you to clear the board by pairing identical tiles. Choose from 8 layouts including the <strong>Daily Challenge</strong>—same puzzle for everyone each day—or levels from 24 tiles (easy) to 104 tiles (hard).', t.seo.p1],
    ['Free Mahjong Solitaire – Shanghai Solitaire Tile Matching Puzzle', t.seo.title],
    ['<h3 class="landing__faq-title">FAQ</h3>', '<h3 class="landing__faq-title">' + t.seo.faqTitle + '</h3>'],
    ["It's a single-player tile-matching puzzle. Match pairs of identical tiles to clear the board. Also called Shanghai Solitaire.", t.faq.whatIs],
    // Help panel
    ['Use the top bar to choose a layout and highlight playable tiles.<br>\n          Use the bottom bar for game actions.<br>\n          Tip: drag the board to move around.', t.help.line1 + '<br>\n          ' + t.help.line2 + '<br>\n          ' + t.help.line3],
    ['Shortcuts: <kbd>N</kbd> New deal · <kbd>Ctrl+Z</kbd> Undo · <kbd>H</kbd> Hint', t.helpShortcuts],
    // Brand & landing
    ['Match the pairs • Pick your level', t.brand.subtitle],
    ['Match the pairs. Pick your level. Play free.', t.landing.tagline],
    ['8 layouts & Daily Challenge', t.landing.feature1],
    ['Auto-hints when you\'re stuck', t.landing.feature2],
    ['No download – play in browser', t.landing.feature3],
    ['Leaderboard & high scores', t.landing.feature4],
    ['Play Now', t.landing.playNow],
    // Layouts
    ['Daily Challenge', t.layouts.daily],
    ['Level 1 (24 tiles)', t.layouts.supereasy],
    ['Level 2 (48 tiles)', t.layouts.easy],
    ['Level 3 (72 tiles)', t.layouts.turtle],
    ['Level 4 (80 tiles)', t.layouts.pyramid],
    ['Level 5 (104 tiles)', t.layouts.hard],
    ['Fort (80 tiles)', t.layouts.fort],
    ['Caterpillar (72 tiles)', t.layouts.caterpillar],
    // UI
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
    ['Close', t.ui.close],
    ['Privacy', t.footer.privacy],
    ['Terms', t.footer.terms],
    [' pairs', ' ' + t.ui.pairs],
    [' tiles', ' ' + t.ui.tiles],
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
  const hreflangBlock = alternateLines + '\n  <link rel="alternate" hreflang="x-default" href="' + base + '/">';
  // Remove existing hreflang lines to avoid duplicates when regenerating
  html = html.replace(/\n  <link rel="alternate" hreflang="[^"]*" href="[^"]*">/g, '');
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
    .replace(/<html lang="en"[^>]*>/, '<html lang="' + lang + '" data-lang="' + lang + '">');
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
