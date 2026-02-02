const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(1).default('change-me-in-production-min-16-chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional().default(''),
  DB_HOST: z.string().optional().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().optional().default(5432),
  DB_NAME: z.string().optional().default(''),
  DB_USER: z.string().optional().default(''),
  DB_PASSWORD: z.string().optional().default(''),
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

