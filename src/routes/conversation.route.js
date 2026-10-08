const express = require("express");

const {
  authBailleurLocataire,
} = require("../middlewares/auth");

const conversationController = require("../controllers/conversation.controller");

const {
  validate,
  createConversationParamsSchema,
  conversationIdSchema,
  contactSearchSchema,
} = require("../validators/conversation.validator");

const routerConversation = express.Router();

/**
 * Recherche les contacts disponibles.
 *
 * Cette route doit être déclarée avant `/:id`.
 */
routerConversation.get(
  "/contacts",
  authBailleurLocataire,
  validate(contactSearchSchema, "query"),
  conversationController.getContacts
);

/**
 * Crée ou réactive une conversation.
 *
 * @param {string} auteur1Id - Identifiant public de l'autre participant.
 */
routerConversation.post(
  "/with/:auteur1Id",
  authBailleurLocataire,
  validate(createConversationParamsSchema, "params"),
  conversationController.createConversation
);

/**
 * Récupère toutes les conversations de l'utilisateur connecté.
 */
routerConversation.get(
  "/",
  authBailleurLocataire,
  conversationController.getConversations
);

/**
 * Récupère une conversation précise.
 */
routerConversation.get(
  "/:id",
  authBailleurLocataire,
  validate(conversationIdSchema, "params"),
  conversationController.getConversation
);

/**
 * Supprime logiquement une conversation pour l'utilisateur connecté.
 */
routerConversation.delete(
  "/:id",
  authBailleurLocataire,
  validate(conversationIdSchema, "params"),
  conversationController.deleteConversation
);

/**
 * Marque une conversation comme lue.
 */
routerConversation.patch(
  "/:id/read",
  authBailleurLocataire,
  validate(conversationIdSchema, "params"),
  conversationController.markConversationAsRead
);

module.exports = {
  routerConversation,
};