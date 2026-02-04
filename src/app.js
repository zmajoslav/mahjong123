const path = require('path');
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const { HttpError } = require('./util/httpErrors');
const { buildApiRouter } = require('./routes/apiRoutes');

// Resolve public folder relative to project root (works when cwd is not project root, e.g. cPanel)
const publicDir = path.resolve(__dirname, '..', 'public');

const STATIC_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.txt', '.xml', '.json'];

function createApp({ env, pool }) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(compression());
  app.use(helmet());
  app.use(cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  // Diagnostic: if you see "Mahjong app OK" the domain is hitting this app, not the stub
  app.get('/ping', (_req, res) => res.type('text/plain').send('Mahjong app OK'));

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
    if (STATIC_EXTENSIONS.includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
    next();
  });
  app.use(express.static(publicDir));
  app.get('/privacy.html', (_req, res) => res.sendFile(path.join(publicDir, 'privacy.html')));
  app.get('/terms.html', (_req, res) => res.sendFile(path.join(publicDir, 'terms.html')));
  ['es', 'fr', 'de', 'pt', 'pl', 'it'].forEach((lang) => {
    app.get('/' + lang, (_req, res) => res.sendFile(path.join(publicDir, lang, 'index.html')));
    app.get('/' + lang + '/', (_req, res) => res.sendFile(path.join(publicDir, lang, 'index.html')));
  });
  app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

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

