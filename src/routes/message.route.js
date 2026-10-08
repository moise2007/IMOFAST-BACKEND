const express = require("express");

const {
  authBailleurLocataire,
} = require("../middlewares/auth");

const messageController = require("../controllers/message.controller");

const {
  validate,
  messageIdSchema,
  conversationIdSchema,
  createMessageSchema,
  updateMessageSchema,
  getMessagesSchema,
} = require("../validators/message.validator");

const routerMessage = express.Router();

/**
 * Envoie un message.
 */
routerMessage.post(
  "/",
  authBailleurLocataire,
  validate(createMessageSchema),
  messageController.sendMessage
);

/**
 * Récupère les messages d'une conversation.
 *
 * Exemple :
 * GET /conversations/cnv_123/messages
 */
routerMessage.get(
  "/conversations/:id",
  authBailleurLocataire,
  validate(conversationIdSchema, "params"),
  validate(getMessagesSchema, "query"),
  messageController.getMessages
);

/**
 * Modifie un message.
 */
routerMessage.patch(
  "/:id",
  authBailleurLocataire,
  validate(messageIdSchema, "params"),
  validate(updateMessageSchema),
  messageController.updateMessage
);

/**
 * Supprime un message.
 */
routerMessage.delete(
  "/:id",
  authBailleurLocataire,
  validate(messageIdSchema, "params"),
  messageController.deleteMessage
);

module.exports = {routerMessage};