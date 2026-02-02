/**
 * Run database migrations (schema.sql).
 * Usage: node src/scripts/runMigrations.js
 * Requires: DATABASE_URL in environment or .env
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPool } = require('../db/pool');

const schemaPath = path.resolve(__dirname, '..', '..', 'schema.sql');

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Set it in .env or environment.');
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
