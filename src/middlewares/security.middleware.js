const rateLimit = require('express-rate-limit');
const xss = require('xss');

// Rate limit strict pour login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Trop de tentatives, réessayez dans 15 minutes" },
  skipSuccessfulRequests: true // Ne compte que les échecs
});

// Nettoyer les données XSS automatiquement
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key].trim());
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Bloquer les injections NoSQL MongoDB
const preventNoSQLInjection = (req, res, next) => {
  const checkForInjection = (obj) => {
    for (let key in obj) {
      // Bloquer les opérateurs MongoDB comme $where, $gt, etc.
      if (key.startsWith('$')) {
        return res.status(400).json({ error: "Requête non autorisée" });
      }
      if (typeof obj[key] === 'object') checkForInjection(obj[key]);
    }
  };

  if (req.body) checkForInjection(req.body);
  if (req.query) checkForInjection(req.query);
  next();
};

module.exports = { loginLimiter, sanitizeInput, preventNoSQLInjection };