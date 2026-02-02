const express = require('express');
const { z } = require('zod');

const { asyncHandler } = require('../util/asyncHandler');
const { HttpError } = require('../util/httpErrors');
const { authMiddleware } = require('../auth/middleware');
const { getUserById } = require('../db/userRepo');
const { getLeaderboard, getUserBestScore, upsertHighScore } = require('../db/solitaireRepo');

function buildApiRouter({ pool, jwtSecret }) {
  const router = express.Router();
  const auth = authMiddleware({ jwtSecret });

  router.get('/leaderboard', asyncHandler(async (req, res) => {
    const parsed = z.object({
      layoutName: z.string().max(32).default('turtle'),
      limit: z.coerce.number().int().positive().max(200).default(50),
    }).safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid query.', 'BAD_REQUEST');
    }

    const rows = await getLeaderboard(pool, {
      layoutName: parsed.data.layoutName,
      limit: parsed.data.limit,
    });
    res.json({
      leaderboard: rows.map((r, i) => ({
        rank: i + 1,
        username: r.username,
        score: r.score,
        elapsedSeconds: r.elapsed_seconds,
      })),
    });
  }));

  router.get('/me', auth, asyncHandler(async (req, res) => {
    const user = await getUserById(pool, { userId: req.user.id });
    if (!user) {
      throw new HttpError(404, 'User not found.', 'NOT_FOUND');
    }

    const bestScore = await getUserBestScore(pool, { userId: user.id, layoutName: 'turtle' });
    res.json({
      user: { id: user.id, username: user.username },
      bestScore: bestScore
        ? { score: bestScore.score, elapsedSeconds: bestScore.elapsed_seconds }
        : null,
    });
  }));

  router.post('/scores', auth, asyncHandler(async (req, res) => {
    const parsed = z.object({
      layoutName: z.string().max(32).default('turtle'),
      score: z.number().int().min(0),
      elapsedSeconds: z.number().int().min(0),
    }).safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid payload.', 'BAD_REQUEST');
    }

    const record = await upsertHighScore(pool, {
      userId: req.user.id,
      layoutName: parsed.data.layoutName,
      score: parsed.data.score,
      elapsedSeconds: parsed.data.elapsedSeconds,
    });
    res.json({ ok: true, record });
  }));

  return router;
}

module.exports = { buildApiRouter };
