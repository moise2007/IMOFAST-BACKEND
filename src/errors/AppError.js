class AppError extends Error {
  constructor(message, statusCode = 500, extra = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.extra = extra;
    this.isOperational = true; // erreur prévue par l'application
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;