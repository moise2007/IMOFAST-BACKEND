const express = require("express");

const {
  authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const commentaireController = require("../controllers/commentaire.controller");

const {
  validate,
  createCommentaireSchema,
  getCommentairesSchema,
  getCommentairesParamsSchema,
  updateCommentaireSchema,
  commentaireIdSchema,
  responseCommentaireSchema,
} = require("../validators/commentaire.validator");

const routerCommentaire = express.Router();

/**
 * Créer un commentaire.
 */
routerCommentaire.post(
  "/",
  authBailleurLocataireAdmin,
  validate(createCommentaireSchema),
  commentaireController.createCommentaire
);

/**
 * Récupérer les commentaires d'une cible.
 *
 * Exemple :
 * GET /commentaires/annonce/annonce_123
 */
routerCommentaire.get(
  "/:col/:id",
  authBailleurLocataireAdmin,
  validate(getCommentairesParamsSchema, "params"),
  validate(getCommentairesSchema, "query"),
  commentaireController.getCommentaires
);

/**
 * Modifier son commentaire.
 *
 * Exemple :
 * PATCH /commentaires/commentaire_123
 */
routerCommentaire.patch(
  "/:id",
  authBailleurLocataireAdmin,
  validate(commentaireIdSchema, "params"),
  validate(updateCommentaireSchema),
  commentaireController.updateCommentaire
);

/**
 * Supprimer son commentaire.
 *
 * Exemple :
 * DELETE /commentaires/commentaire_123
 */
routerCommentaire.delete(
  "/:id",
  authBailleurLocataireAdmin,
  validate(commentaireIdSchema, "params"),
  commentaireController.deleteCommentaire
);

/**
 * Répondre à un commentaire.
 *
 * Exemple :
 * POST /commentaires/commentaire_123/reponses
 */
routerCommentaire.post(
  "/:id/reponses",
  authBailleurLocataireAdmin,
  validate(commentaireIdSchema, "params"),
  validate(responseCommentaireSchema),
  commentaireController.respondToCommentaire
);

module.exports = {
  routerCommentaire,
};