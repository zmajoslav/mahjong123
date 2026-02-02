require('dotenv').config();

const { createApp } = require('./app');
const { loadEnv } = require('./config/env');
const { getPool } = require('./db/pool');
const { ensureExtensions } = require('./db/migrations');

async function main() {
  const env = loadEnv();
  let pool = null;
  if (env.DATABASE_URL) {
    pool = getPool(env.DATABASE_URL);
    await ensureExtensions(pool);
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
