const path = require('path');
const crypto = require('crypto');
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const https = require('https');

const { HttpError } = require('./util/httpErrors');
const { buildApiRouter } = require('./routes/apiRoutes');

// Google Analytics Measurement Protocol (GA4)
// To get the API Secret: Google Analytics > Admin > Data Streams > Your Stream > Measurement Protocol API secrets
const GA_MEASUREMENT_ID = 'G-8JXSH47NCK';
const GA_API_SECRET = process.env.GA_API_SECRET || 'placeholder'; // Set in environment for production

// Resolve public folder relative to project root (works when cwd is not project root, e.g. cPanel)
const publicDir = path.resolve(__dirname, '..', 'public');

const STATIC_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.txt', '.xml', '.json'];

function createApp({ env, pool }) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(compression());
  
  app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    res.setHeader('X-App-Debug-Version', '18');
    next();
  });

  // app.use(helmet({
  //   contentSecurityPolicy: false,
  // }));
  app.use(cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  // Diagnostic: if you see "Mahjong app OK" the domain is hitting this app, not the stub
  app.get('/ping', (_req, res) => res.type('text/plain').send('Mahjong app OK'));

  // Server-side Google Analytics proxy endpoint
  // This allows tracking without CSP issues since the browser only talks to our server
  app.post('/api/analytics', (req, res) => {
    const { event_name, page_path, page_title, client_id } = req.body || {};
    
    // Generate a client ID if not provided (should be stored in localStorage on client)
    const cid = client_id || crypto.randomUUID();
    
    const payload = {
      client_id: cid,
      events: [{
        name: event_name || 'page_view',
        params: {
          page_location: `https://mahjongboss.com${page_path || '/'}`,
          page_title: page_title || 'Mahjong Boss',
          engagement_time_msec: '100',
        }
      }]
    };

    // Send to GA4 Measurement Protocol
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'www.google-analytics.com',
      port: 443,
      path: `/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const gaReq = https.request(options, (gaRes) => {
      // GA4 returns 204 No Content on success
      res.status(200).json({ ok: true, client_id: cid });
    });

    gaReq.on('error', (err) => {
      console.error('GA tracking error:', err.message);
      // Don't fail the request even if GA fails
      res.status(200).json({ ok: true, client_id: cid });
    });

    gaReq.write(postData);
    gaReq.end();
  });

  app.get('/api/config', (req, res) => {
    const baseUrl = env.BASE_URL || `${req.protocol}://${req.get('host') || req.headers.host || 'localhost'}`;
    res.json({ baseUrl });
  });

  const requirePool = (req, res, next) => {
    if (!pool) {
      return res.status(503).json({ error: { code: 'UNAVAILABLE', message: 'Service temporarily unavailable.' } });
    }
    next();
  };

  app.use('/api', requirePool, buildApiRouter({ pool }));

  // Long cache for static assets (Lighthouse: "Use efficient cache lifetimes")
  app.use((req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    if (req.path === '/sw.js') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (STATIC_EXTENSIONS.includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
    next();
  });
  const setCsp = (res) => {
    const nonce = res.locals.nonce;
    const csp = [
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
      `script-src * 'unsafe-inline' 'unsafe-eval' data: blob: 'nonce-${nonce}';`,
      `script-src-elem * 'unsafe-inline' 'unsafe-eval' data: blob: 'nonce-${nonce}';`,
      "script-src-attr 'unsafe-inline';",
      "style-src * 'unsafe-inline';",
      "img-src * data: blob:;",
      "font-src * data:;",
      "connect-src *;",
      "frame-src *;",
      "object-src 'none';"
    ].join(' ');
    res.setHeader('Content-Security-Policy', csp);
  };

  const sendHtmlWithNonce = (req, res, filePath) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return res.status(404).send('Not Found');
      }
      setCsp(res);
      const nonce = res.locals.nonce;
      // Inject nonce into all script tags
      const html = data.replace(/<script/g, `<script nonce="${nonce}"`);
      res.send(html);
    });
  };

  app.get('/privacy.html', (req, res) => sendHtmlWithNonce(req, res, path.join(publicDir, 'privacy.html')));
  app.get('/terms.html', (req, res) => sendHtmlWithNonce(req, res, path.join(publicDir, 'terms.html')));
  
  // Localized routes
  const langs = ['es', 'fr', 'de', 'pt', 'pl', 'it', 'nl', 'ru', 'ja', 'zh', 'ko', 'ar', 'hi', 'tr', 'sv', 'cs', 'sk', 'uk', 'ro', 'el', 'id', 'th', 'vi', 'hu'];
  langs.forEach((lang) => {
    app.get('/' + lang, (req, res) => sendHtmlWithNonce(req, res, path.join(publicDir, lang, 'index.html')));
    app.get('/' + lang + '/', (req, res) => sendHtmlWithNonce(req, res, path.join(publicDir, lang, 'index.html')));
  });

  // Serve static assets EXCEPT HTML
  app.use(express.static(publicDir, {
    index: false,
    extensions: STATIC_EXTENSIONS.filter(e => e !== '.html').map(e => e.slice(1))
  }));

  // Default route for index.html
  app.get('*', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    if (!ext || ext === '.html') {
      return sendHtmlWithNonce(req, res, path.join(publicDir, 'index.html'));
    }
    next();
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    }
    // Log the full error for debugging
    console.error('Unexpected error:', err);
    // Production: don’t leak internal details.
    if (env.NODE_ENV === 'production') {
      return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal Server Error: ' + err.message } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
  });

  return app;
}

module.exports = { createApp };

