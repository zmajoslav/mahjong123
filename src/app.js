const path = require('path');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const { HttpError } = require('./util/httpErrors');
const { buildAuthRouter } = require('./routes/authRoutes');
const { buildApiRouter } = require('./routes/apiRoutes');

// Resolve public folder relative to project root (works when cwd is not project root, e.g. cPanel)
const publicDir = path.resolve(__dirname, '..', 'public');

function createApp({ env, pool }) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/config', (req, res) => {
    const baseUrl = env.BASE_URL || `${req.protocol}://${req.get('host') || req.headers.host || 'localhost'}`;
    res.json({ baseUrl });
  });

  app.use('/api/auth', buildAuthRouter({ env, pool }));
  app.use('/api', buildApiRouter({ env, pool, jwtSecret: env.JWT_SECRET }));

  app.use(express.static(publicDir));
  app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    }
    // Production: don’t leak internal details.
    if (env.NODE_ENV === 'production') {
      return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal Server Error' } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
  });

  return app;
}

module.exports = { createApp };

