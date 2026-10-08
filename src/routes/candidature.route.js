const express = require("express");

const {
  authAdminLocataire,
  authBailleurAdmin,
  authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const candidatureController = require("../controllers/candidature.controller");

const {
  validate,
  createCandidatureSchema,
  getCandidaturesSchema,
  getCandidatureSchema,
  updateCandidatureSchema,
  candidatureActionSchema,
  programmerCandidatureSchema,
} = require("../validators/candidature.validator");

const routerCandidature = express.Router();

/**
 * Crée une nouvelle candidature.
 *
 * Accessible aux locataires et administrateurs.
 */
routerCandidature.post(
  "/",
  authAdminLocataire,
  validate(createCandidatureSchema),
  candidatureController.createCandidature
);

/**
 * Récupère la liste des candidatures de l'utilisateur connecté.
 *
 * Accessible aux bailleurs, locataires et administrateurs.
 */
routerCandidature.get(
  "/",
  authBailleurLocataireAdmin,
  validate(getCandidaturesSchema, "query"),
  candidatureController.getCandidatures
);

/**
 * Récupère le détail d'une candidature.
 *
 * Accessible aux bailleurs, locataires et administrateurs.
 */
routerCandidature.get(
  "/:id",
  authBailleurLocataireAdmin,
  validate(getCandidatureSchema, "params"),
  candidatureController.getCandidature
);

/**
 * Accepte une candidature.
 *
 * Accessible aux bailleurs et administrateurs.
 */
routerCandidature.put(
  "/set-accept/:id",
  authBailleurAdmin,
  validate(candidatureActionSchema, "params"),
  candidatureController.acceptCandidature
);

/**
 * Refuse une candidature.
 *
 * Accessible aux bailleurs et administrateurs.
 */
routerCandidature.put(
  "/set-refus/:id",
  authBailleurAdmin,
  validate(candidatureActionSchema, "params"),
  candidatureController.refuseCandidature
);

/**
 * Annule une candidature.
 *
 * Accessible aux bailleurs, locataires et administrateurs.
 */
routerCandidature.put(
  "/set-annuler/:id",
  authBailleurLocataireAdmin,
  validate(candidatureActionSchema, "params"),
  candidatureController.cancelCandidature
);

/**
 * Programme ou reprogramme une visite.
 *
 * Accessible aux bailleurs et administrateurs.
 */
routerCandidature.put(
  "/set-newDate/:id",
  authBailleurAdmin,
  validate(candidatureActionSchema, "params"),
  validate(programmerCandidatureSchema),
  candidatureController.programmerCandidature
);

/**
 * Modifie les informations d'une candidature.
 *
 * Accessible aux locataires et administrateurs.
 */
routerCandidature.patch(
  "/:id",
  authAdminLocataire,
  validate(candidatureActionSchema, "params"),
  validate(updateCandidatureSchema),
  candidatureController.updateCandidature
);

/**
 * Supprime logiquement une candidature pour l'utilisateur connecté.
 *
 * Accessible aux bailleurs, locataires et administrateurs.
 */
routerCandidature.delete(
  "/:id",
  authBailleurLocataireAdmin,
  validate(candidatureActionSchema, "params"),
  candidatureController.deleteCandidature
);

module.exports = {
  routerCandidature,
};