const { body, validationResult } = require('express-validator');

// Règles de validation pour l'inscription
const registerRules = [
    body('prenom')
        .trim()
        .notEmpty().withMessage("Le nom est requis")
        .isLength({ min: 2, max: 50 }).withMessage("Entre 2 et 50 caractères")
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage("Lettres uniquement"),

    body('nom')
        .trim()
        .notEmpty().withMessage("Le nom est requis")
        .isLength({ min: 2, max: 50 }).withMessage("Entre 2 et 50 caractères")
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage("Lettres uniquement"),
    body('email')
        .trim()
        .notEmpty().withMessage("L'email est requis")
        .isEmail().withMessage("Email invalide")
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage("Le mot de passe est requis")
        .isLength({ min: 8 }).withMessage("Minimum 8 caractères")
        .matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
        .withMessage("Doit contenir 1 majuscule, 1 chiffre, 1 caractère spécial"),

];

// Règles de validation pour la connexion
const loginRules = [
  body('email').trim().isEmail().withMessage("Email invalide").normalizeEmail(),
  body('password').notEmpty().withMessage("Mot de passe requis")
];

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

module.exports = { registerRules, loginRules, validate };