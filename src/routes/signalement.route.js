const express = require("express");

const {
  authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const signalementController = require("../controllers/signalement.controller");

const {
  validate,
  createSignalementSchema,
  signalementIdSchema,
  getSignalementsSchema,
  updateSignalementSchema,
} = require("../validators/signalement.validator");

const routerSignalement = express.Router();

/**
 * Créer un signalement.
 */
routerSignalement.post(
  "/",
  authBailleurLocataireAdmin,
  validate(createSignalementSchema),
  signalementController.createSignalement
);

/**
 * Récupérer les signalements avec filtres.
 */
routerSignalement.get(
  "/",
  authBailleurLocataireAdmin,
  validate(getSignalementsSchema, "query"),
  signalementController.getSignalements
);

/**
 * Récupérer un signalement par son idPublic.
 */
routerSignalement.get(
  "/:id",
  authBailleurLocataireAdmin,
  validate(signalementIdSchema, "params"),
  signalementController.getSignalement
);

/**
 * Modifier un signalement.
 */
routerSignalement.patch(
  "/:id",
  authBailleurLocataireAdmin,
  validate(signalementIdSchema, "params"),
  validate(updateSignalementSchema),
  signalementController.updateSignalement
);

/**
 * Supprimer un signalement.
 */
routerSignalement.delete(
  "/:id",
  authBailleurLocataireAdmin,
  validate(signalementIdSchema, "params"),
  signalementController.deleteSignalement
);

module.exports = {
  routerSignalement,
};