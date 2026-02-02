-- Mahjong Solitaire schema (Shanghai-style tile-matching puzzle)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solitaire high scores (one per user per layout)
CREATE TABLE IF NOT EXISTS solitaire_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  layout_name TEXT NOT NULL DEFAULT 'turtle',
  score INTEGER NOT NULL,
  elapsed_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, layout_name)
);

CREATE INDEX IF NOT EXISTS idx_solitaire_scores_layout ON solitaire_scores(layout_name, score DESC);
CREATE INDEX IF NOT EXISTS idx_solitaire_scores_user ON solitaire_scores(user_id);

-- Leaderboard view (top scores per layout)
CREATE OR REPLACE VIEW solitaire_leaderboard AS
  SELECT s.id, s.user_id, u.username, s.layout_name, s.score, s.elapsed_seconds, s.created_at,
    ROW_NUMBER() OVER (PARTITION BY s.layout_name ORDER BY s.score DESC, s.elapsed_seconds ASC) AS rank
  FROM solitaire_scores s
  JOIN users u ON u.id = s.user_id;
