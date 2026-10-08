const { validationResult } = require('express-validator');



// Middleware qui vérifie les erreurs
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(e => ({ champ: e.path, message: e.msg }))
    });
  }
  next();
};

module.exports = { validate };