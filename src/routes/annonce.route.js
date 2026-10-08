const express = require("express");

const {
  authAdminLocataire,
  authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const annonceController = require("../controllers/annonce.controller");

const {
  validate,
  createAnnonceSchema,
  getAnnoncesSchema,
  getAnnonceSchema,
  updateAnnonceSchema,
  deleteAnnonceSchema,
} = require("../validators/annonce.validator");

const routerAnnonce = express.Router();

/**
 * Création d'une annonce.
 *
 * Seul un bailleur doit pouvoir créer une annonce.
 */
routerAnnonce.post(
  "/",
  authBailleurLocataireAdmin,
  validate(createAnnonceSchema),
  annonceController.createAnnonceBailleur
);

/**
 * Récupération de la liste des annonces.
 *
 * Les paramètres de recherche et de pagination sont
 * validés depuis req.query.
 */
routerAnnonce.get(
  "/",
  authBailleurLocataireAdmin,
  validate(getAnnoncesSchema, "query"),
  annonceController.getAnnonces
);

/**
 * Suppression d'une annonce.
 */
routerAnnonce.delete(
  "/:id",
  authBailleurLocataireAdmin,
  validate(deleteAnnonceSchema, "params"),
  annonceController.deleteAnnonceBailleur
);

/**
 * Récupération d'une annonce.
 */
routerAnnonce.get(
  "/:id",
  authBailleurLocataireAdmin,
  validate(getAnnonceSchema, "params"),
  annonceController.getAnnonce
);

/**
 * Modification d'une annonce.
 *
 * Les paramètres de l'URL et le body sont validés
 * séparément.
 */
routerAnnonce.patch(
  "/:id",
  authBailleurLocataireAdmin,
  validate(getAnnonceSchema, "params"),
  validate(updateAnnonceSchema),
  annonceController.updateAnnonceBailleur
);

module.exports = {routerAnnonce,};