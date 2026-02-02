const { z } = require('zod');

// Hardcoded fallbacks for deployment when env vars are not passed (e.g. cPanel).
// WARNING: If repo is public, rotate DB_PASSWORD and JWT_SECRET after deployment.
const FALLBACKS = {
  NODE_ENV: 'production',
  PORT: 3001,
  HOST: '127.0.0.1',
  JWT_SECRET: 'mahjongboss-super-secret-2026-xyz',
  ALLOWED_ORIGINS: 'https://mahjongboss.com',
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_NAME: 'letswnsc_mahjong',
  DB_USER: 'letswnsc_mahjonger',
  DB_PASSWORD: 'C3P{LwQi89gN',
};

const envSchema = z.object({
  NODE_ENV: z.string().default(FALLBACKS.NODE_ENV),
  PORT: z.coerce.number().int().positive().default(FALLBACKS.PORT),
  HOST: z.string().default(FALLBACKS.HOST),
  JWT_SECRET: z.string().min(1).default(FALLBACKS.JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ALLOWED_ORIGINS: z.string().default(FALLBACKS.ALLOWED_ORIGINS),
  DATABASE_URL: z.string().optional().default(''),
  DB_HOST: z.string().optional().default(FALLBACKS.DB_HOST),
  DB_PORT: z.coerce.number().int().positive().optional().default(FALLBACKS.DB_PORT),
  DB_NAME: z.string().optional().default(FALLBACKS.DB_NAME),
  DB_USER: z.string().optional().default(FALLBACKS.DB_USER),
  DB_PASSWORD: z.string().optional().default(FALLBACKS.DB_PASSWORD),
  BASE_URL: z.string().optional(),
});

function buildDatabaseUrl(parsed) {
  if (parsed.DATABASE_URL) {
    return parsed.DATABASE_URL;
  }
  if (parsed.DB_NAME && parsed.DB_USER) {
    const encodedPassword = encodeURIComponent(parsed.DB_PASSWORD || '');
    return `postgresql://${parsed.DB_USER}:${encodedPassword}@${parsed.DB_HOST}:${parsed.DB_PORT}/${parsed.DB_NAME}`;
  }
  return '';
}

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${errors}`);
  }

  const allowedOrigins = parsed.data.ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const databaseUrl = buildDatabaseUrl(parsed.data);
  if (!databaseUrl && process.env.NODE_ENV === 'production') {
    console.warn('DATABASE_URL (or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD) not set. Leaderboard and auth disabled.');
  }

  return {
    ...parsed.data,
    ALLOWED_ORIGINS: allowedOrigins,
    DATABASE_URL: databaseUrl,
  };
}

module.exports = { loadEnv };

