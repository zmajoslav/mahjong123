const crypto = require('crypto');

async function insertGuestScore(pool, { displayName, layoutName, score, elapsedSeconds }) {
  const id = crypto.randomUUID();
  const result = await pool.query(
    `
      INSERT INTO solitaire_scores (id, user_id, display_name, layout_name, score, elapsed_seconds)
      VALUES ($1, NULL, $2, $3, $4, $5)
      RETURNING id, layout_name, score, elapsed_seconds, created_at
    `,
    [id, displayName.trim().slice(0, 32), layoutName || 'turtle', score, elapsedSeconds],
  );
  return result.rows[0];
}

async function upsertHighScore(pool, { userId, layoutName, score, elapsedSeconds }) {
  const id = crypto.randomUUID();
  const result = await pool.query(
    `
      INSERT INTO solitaire_scores (id, user_id, layout_name, score, elapsed_seconds)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, layout_name)
      DO UPDATE SET
        score = GREATEST(solitaire_scores.score, $4),
        elapsed_seconds = CASE
          WHEN solitaire_scores.score < $4 THEN $5
          WHEN solitaire_scores.score = $4 AND solitaire_scores.elapsed_seconds > $5 THEN $5
          ELSE solitaire_scores.elapsed_seconds
        END,
        created_at = CASE
          WHEN solitaire_scores.score < $4 THEN now()
          WHEN solitaire_scores.score = $4 AND solitaire_scores.elapsed_seconds > $5 THEN now()
          ELSE solitaire_scores.created_at
        END
      RETURNING id, user_id, layout_name, score, elapsed_seconds, created_at
    `,
    [id, userId, layoutName || 'turtle', score, elapsedSeconds],
  );
  return result.rows[0];
}

async function getLeaderboard(pool, { layoutName, limit }) {
  const result = await pool.query(
    `
      SELECT COALESCE(s.display_name, u.username) AS username, s.score, s.elapsed_seconds, s.created_at
      FROM solitaire_scores s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.layout_name = $1 AND (s.display_name IS NOT NULL OR s.user_id IS NOT NULL)
      ORDER BY s.score DESC, s.elapsed_seconds ASC
      LIMIT $2
    `,
    [layoutName || 'turtle', limit],
  );
  return result.rows;
}

async function getUserBestScore(pool, { userId, layoutName }) {
  const result = await pool.query(
    `
      SELECT score, elapsed_seconds, created_at
      FROM solitaire_scores
      WHERE user_id = $1 AND layout_name = $2
    `,
    [userId, layoutName || 'turtle'],
  );
  return result.rows[0] || null;
}

module.exports = {
  getLeaderboard,
  getUserBestScore,
  upsertHighScore,
  insertGuestScore,
};
