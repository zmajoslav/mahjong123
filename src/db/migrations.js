const fs = require('fs');
const path = require('path');

async function ensureExtensions(pool) {
  // No extensions required. gen_random_uuid() is built-in on PostgreSQL 13+.
  // Shared hosts often don't allow pgcrypto.
}

async function runSchema(pool) {
  const schemaPath = path.resolve(__dirname, '..', '..', 'schema.sql');
  if (!fs.existsSync(schemaPath)) return;
  
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    // Run the entire schema.sql. 
    // We use IF NOT EXISTS in the SQL to make it safe to run multiple times.
    await pool.query(sql);
    console.log('Database schema verified/updated.');
  } catch (err) {
    console.error('Failed to update database schema:', err.message);
  }
}

module.exports = { ensureExtensions, runSchema };

