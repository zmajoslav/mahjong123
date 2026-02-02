async function createUser(pool, { username, passwordHash }) {
  const result = await pool.query(
    `
      INSERT INTO users (username, password_hash)
      VALUES ($1, $2)
      RETURNING id, username, created_at
    `,
    [username, passwordHash],
  );
  return result.rows[0];
}

async function getUserByUsername(pool, { username }) {
  const result = await pool.query(
    `
      SELECT id, username, password_hash, created_at
      FROM users
      WHERE username = $1
    `,
    [username],
  );
  return result.rows[0] || null;
}

async function getUserById(pool, { userId }) {
  const result = await pool.query(
    `
      SELECT id, username, created_at
      FROM users
      WHERE id = $1
    `,
    [userId],
  );
  return result.rows[0] || null;
}

module.exports = {
  createUser,
  getUserById,
  getUserByUsername,
};

