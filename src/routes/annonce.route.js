const express = require("express");

const {
  authAdminLocataire,
  authBailleurLocataireAdmin,
  authBailleurAdmin,
  authLocataire,
  identifierUtilisateur,
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
routerAnnonce.get("/selections", annonceController.getSelections);

routerAnnonce.get("/recherches/recentes", authLocataire, annonceController.getRecherchesRecentes);

const { z } = require("zod");
const { asyncHandler } = require("../utils/asyncHandler");
const { recordAnnonceView } = require("../services/metrics/consultation.service");


routerAnnonce.post("/:id/vues", identifierUtilisateur, require("../middlewares/anonymousVisitor"),
  validate(getAnnonceSchema, "params"),
  validate(z.object({ type: z.enum(["simple", "profonde"]) }).strict()),
  asyncHandler(async (req, res) => {
    let counted;
    try { counted = await recordAnnonceView({ id: req.params.id, type: req.body.type, user: req.user, role: req.role, anonymousId: req.anonymousId }); }
    catch (error) { if (error.message.startsWith('errors:')) error.message = req.t(error.message); throw error; }
    res.json({ success: true, counted });
  }));

/**
 * Création d'une annonce.
 *
 * Seul un bailleur doit pouvoir créer une annonce.
 */
routerAnnonce.post(
  "/",
  authBailleurAdmin,
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
  identifierUtilisateur,
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
  identifierUtilisateur,
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
