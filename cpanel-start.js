require('dotenv').config();

const { createApp } = require('./src/app');
const { loadEnv } = require('./src/config/env');
const { ensureExtensions, runSchema } = require('./src/db/migrations');
const { getPool } = require('./src/db/pool');

async function main() {
  const env = loadEnv();

  let pool = null;
  if (env.DATABASE_URL) {
    pool = getPool(env.DATABASE_URL);
    await ensureExtensions(pool);
    await runSchema(pool);
  }

  const app = createApp({ env, pool });

  app.listen(env.PORT, env.HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://${env.HOST}:${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

