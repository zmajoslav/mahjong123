const pg = require('pg');

let pool;

function getPool(databaseUrl) {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: databaseUrl,
    });
  }
  return pool;
}

module.exports = { getPool };

