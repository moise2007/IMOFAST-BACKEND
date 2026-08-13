const express = require("express");
const { body } = require("express-validator");
const { validate } = require("../middlewares/validate.middleware");
const { sendContact } = require("../controllers/contact/sendContact");
const { limitAuth } = require("../middlewares/rateLimit");

const contactRules = [
  body("nom")
    .trim()
    .notEmpty().withMessage("Le nom est requis")
    .isLength({ min: 2, max: 80 }).withMessage("Le nom doit contenir entre 2 et 80 caractères"),
  body("email")
    .trim()
    .notEmpty().withMessage("L'email est requis")
    .isEmail().withMessage("Email invalide")
    .normalizeEmail(),
  body("sujet")
    .trim()
    .notEmpty().withMessage("Le sujet est requis")
    .isLength({ min: 3, max: 120 }).withMessage("Le sujet doit contenir entre 3 et 120 caractères"),
  body("message")
    .trim()
    .notEmpty().withMessage("Le message est requis")
    .isLength({ min: 10, max: 2000 }).withMessage("Le message doit contenir entre 10 et 2000 caractères"),
];

const routerContact = express.Router();

routerContact.post("/", limitAuth, contactRules, validate, sendContact);

module.exports = { routerContact };
