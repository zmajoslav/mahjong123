-- Mahjong Solitaire schema (Shanghai-style tile-matching puzzle)
-- UUIDs are generated in Node.js (crypto.randomUUID) for shared hosting compatibility.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solitaire high scores (one per user per layout)
CREATE TABLE IF NOT EXISTS solitaire_scores (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  layout_name TEXT NOT NULL DEFAULT 'turtle',
  score INTEGER NOT NULL,
  elapsed_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, layout_name)
);

CREATE INDEX IF NOT EXISTS idx_solitaire_scores_layout ON solitaire_scores(layout_name, score DESC);
CREATE INDEX IF NOT EXISTS idx_solitaire_scores_user ON solitaire_scores(user_id);

-- Guest scores: display_name for anonymous high scores (no account required)
ALTER TABLE solitaire_scores ADD COLUMN IF NOT EXISTS display_name TEXT;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'solitaire_scores' AND column_name = 'user_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE solitaire_scores ALTER COLUMN user_id DROP NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Leaderboard view (top scores per layout; uses display_name for guest scores)
CREATE OR REPLACE VIEW solitaire_leaderboard AS
  SELECT s.id, s.user_id, COALESCE(s.display_name, u.username) AS username,
    s.layout_name, s.score, s.elapsed_seconds, s.created_at,
    ROW_NUMBER() OVER (PARTITION BY s.layout_name ORDER BY s.score DESC, s.elapsed_seconds ASC) AS rank
  FROM solitaire_scores s
  LEFT JOIN users u ON u.id = s.user_id
  WHERE s.display_name IS NOT NULL OR s.user_id IS NOT NULL;
