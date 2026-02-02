class HttpError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code || 'HTTP_ERROR';
  }
}

function assertNever(value, message) {
  throw new Error(message || `Unexpected value: ${String(value)}`);
}

module.exports = { HttpError, assertNever };

