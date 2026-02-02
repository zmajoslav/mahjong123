/**
 * Run database migrations (schema.sql).
 * Usage: node src/scripts/runMigrations.js
 * Requires: DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD in .env or environment
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../config/env');
const { getPool } = require('../db/pool');

const schemaPath = path.resolve(__dirname, '..', '..', 'schema.sql');

async function runMigrations() {
  let databaseUrl;
  try {
    const env = loadEnv();
    databaseUrl = env.DATABASE_URL;
  } catch (e) {
    console.error('Environment error:', e.message);
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error('No database configured. Set DATABASE_URL or DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.');
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  const pool = getPool(databaseUrl);

  try {
    await pool.query(sql);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
