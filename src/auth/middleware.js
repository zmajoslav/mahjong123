const { HttpError } = require('../util/httpErrors');
const { verifyAnyToken } = require('./jwt');

function authMiddleware({ jwtSecret }) {
  return function auth(req, _res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new HttpError(401, 'Missing Bearer token.', 'AUTH_MISSING'));
    }

    try {
      const verified = verifyAnyToken(token, { jwtSecret });
      if (verified.kind !== 'user') {
        return next(new HttpError(401, 'User token required.', 'AUTH_USER_REQUIRED'));
      }
      req.user = { id: verified.userId };
      return next();
    } catch (_err) {
      return next(new HttpError(401, 'Invalid token.', 'AUTH_INVALID'));
    }
  };
}

module.exports = { authMiddleware };

