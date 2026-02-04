/**
 * Minify public JS and CSS for production.
 * Run: npm run build:min
 * Outputs: public/client.min.js, public/solitaire-engine.min.js, public/styles.min.css
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

async function main() {
  const terser = require('terser');
  const CleanCSS = require('clean-css');

  const jsFiles = ['client.js', 'solitaire-engine.js'];
  for (const name of jsFiles) {
    const filePath = path.join(publicDir, name);
    const code = fs.readFileSync(filePath, 'utf8');
    const result = await terser.minify(code, { format: { comments: false } });
    if (result.error) throw result.error;
    fs.writeFileSync(path.join(publicDir, name.replace('.js', '.min.js')), result.code, 'utf8');
    console.log('Minified ' + name + ' -> ' + name.replace('.js', '.min.js'));
  }

  const cssPath = path.join(publicDir, 'styles.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  const clean = new CleanCSS({ level: 2 });
  const minCss = clean.minify(css);
  if (minCss.errors.length) throw new Error(minCss.errors.join('; '));
  fs.writeFileSync(path.join(publicDir, 'styles.min.css'), minCss.styles, 'utf8');
  console.log('Minified styles.css -> styles.min.css');
  console.log('Done. Use .min assets in production or configure server to serve them.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
