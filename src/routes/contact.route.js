const express = require("express");

const {
  authAdmin,
} = require("../middlewares/auth");

const {
  limitAuth,
} = require("../middlewares/rateLimit");

const {
  validate,
  createContactSchema,
  contactIdSchema,
  getContactsSchema,
  updateContactStatusSchema,
  replyContactSchema,
} = require("../validators/contact.validator");

const {
  createContact,
  getContacts,
  updateContactStatus,
  replyToContact,
} = require("../controllers/contact.controller");

const routerContact = express.Router();

/**
 * POST /contacts
 *
 * Permet à un utilisateur d'envoyer un message
 * depuis le formulaire de contact.
 */
routerContact.post(
  "/",
  limitAuth,
  validate(createContactSchema),
  createContact
);

/**
 * GET /contacts
 *
 * Réservé à l'administration.
 */
routerContact.get(
  "/",
  authAdmin,
  validate(getContactsSchema, "query"),
  getContacts
);

/**
 * PATCH /contacts/:id/status
 *
 * Modifie le statut d'un contact.
 */
routerContact.patch(
  "/:id/status",
  authAdmin,
  validate(contactIdSchema, "params"),
  validate(updateContactStatusSchema),
  updateContactStatus
);

/**
 * POST /contacts/:id/reply
 *
 * Permet à un administrateur de répondre
 * à l'adresse email enregistrée sur le contact.
 */
routerContact.post(
  "/:id/reply",
  authAdmin,
  validate(contactIdSchema, "params"),
  validate(replyContactSchema),
  replyToContact
);

module.exports = {
  routerContact,
};