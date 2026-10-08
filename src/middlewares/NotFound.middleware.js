const AppError = require("../errors/AppError");

module.exports = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} introuvable`, 404));
};