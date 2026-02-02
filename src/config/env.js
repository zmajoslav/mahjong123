const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  BASE_URL: z.string().url().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${errors}`);
  }

  const allowedOrigins = parsed.data.ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    ...parsed.data,
    ALLOWED_ORIGINS: allowedOrigins,
  };
}

module.exports = { loadEnv };

