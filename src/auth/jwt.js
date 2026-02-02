const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function signAccessToken({ userId }, { jwtSecret, expiresIn }) {
  return jwt.sign(
    { sub: userId, typ: 'user' },
    jwtSecret,
    { expiresIn },
  );
}

function signGuestToken({ guestId, gamesPlayed }, { jwtSecret, expiresIn }) {
  return jwt.sign(
    { sub: `guest:${guestId}`, typ: 'guest', gamesPlayed },
    jwtSecret,
    { expiresIn },
  );
}

function createNewGuestToken({ jwtSecret }) {
  const guestId = crypto.randomUUID();
  const token = signGuestToken(
    { guestId, gamesPlayed: 0 },
    { jwtSecret, expiresIn: '30d' },
  );
  return { token, guestId, gamesPlayed: 0 };
}

function verifyAnyToken(token, { jwtSecret }) {
  const payload = jwt.verify(token, jwtSecret);
  if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string') {
    throw new Error('Invalid token payload.');
  }

  const typ = payload.typ;
  if (typ === 'user') {
    return { kind: 'user', userId: payload.sub };
  }

  if (typ === 'guest' && payload.sub.startsWith('guest:')) {
    const guestId = payload.sub.slice('guest:'.length);
    const gamesPlayed = Number.isInteger(payload.gamesPlayed) ? payload.gamesPlayed : 0;
    return { kind: 'guest', guestId, gamesPlayed: Math.max(0, gamesPlayed) };
  }

  // Backwards compatibility with older tokens that didn’t set typ.
  return { kind: 'user', userId: payload.sub };
}

module.exports = {
  createNewGuestToken,
  signAccessToken,
  signGuestToken,
  verifyAnyToken,
};

