async function ensureExtensions(pool) {
  // Needed for gen_random_uuid() in schema.sql
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
}

module.exports = { ensureExtensions };

