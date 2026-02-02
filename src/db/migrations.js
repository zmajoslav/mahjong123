async function ensureExtensions(pool) {
  // No extensions required. gen_random_uuid() is built-in on PostgreSQL 13+.
  // Shared hosts often don't allow pgcrypto.
}

module.exports = { ensureExtensions };

