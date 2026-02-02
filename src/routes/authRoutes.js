const bcrypt = require('bcrypt');
const express = require('express');
const { z } = require('zod');

const { asyncHandler } = require('../util/asyncHandler');
const { HttpError } = require('../util/httpErrors');
const { signAccessToken } = require('../auth/jwt');
const { createUser, getUserByUsername } = require('../db/userRepo');

const registerSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function buildAuthRouter({ env, pool }) {
  const router = express.Router();

  router.post('/register', asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid registration payload.', 'BAD_REQUEST');
    }

    const existing = await getUserByUsername(pool, { username: parsed.data.username });
    if (existing) {
      throw new HttpError(409, 'Username already taken.', 'USERNAME_TAKEN');
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await createUser(pool, { username: parsed.data.username, passwordHash });

    const token = signAccessToken(
      { userId: user.id },
      { jwtSecret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN },
    );

    res.status(201).json({ user: { id: user.id, username: user.username }, token });
  }));

  router.post('/login', asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid login payload.', 'BAD_REQUEST');
    }

    const user = await getUserByUsername(pool, { username: parsed.data.username });
    if (!user) {
      throw new HttpError(401, 'Invalid credentials.', 'AUTH_INVALID');
    }

    const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!ok) {
      throw new HttpError(401, 'Invalid credentials.', 'AUTH_INVALID');
    }

    const token = signAccessToken(
      { userId: user.id },
      { jwtSecret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN },
    );

    res.json({ user: { id: user.id, username: user.username }, token });
  }));

  return router;
}

module.exports = { buildAuthRouter };

