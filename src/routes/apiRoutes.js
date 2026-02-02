const express = require('express');
const { z } = require('zod');

const { asyncHandler } = require('../util/asyncHandler');
const { HttpError } = require('../util/httpErrors');
const { getLeaderboard, insertGuestScore } = require('../db/solitaireRepo');

function buildApiRouter({ pool }) {
  const router = express.Router();

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

  router.post('/scores', asyncHandler(async (req, res) => {
    const parsed = z.object({
      displayName: z.string().min(1).max(32).transform((s) => s.trim()),
      layoutName: z.string().max(32).default('turtle'),
      score: z.number().int().min(0),
      elapsedSeconds: z.number().int().min(0),
    }).safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid payload. Name required (1–32 chars).', 'BAD_REQUEST');
    }

    const record = await insertGuestScore(pool, {
      displayName: parsed.data.displayName,
      layoutName: parsed.data.layoutName,
      score: parsed.data.score,
      elapsedSeconds: parsed.data.elapsedSeconds,
    });
    res.status(201).json({ ok: true, record });
  }));

  return router;
}

module.exports = { buildApiRouter };
