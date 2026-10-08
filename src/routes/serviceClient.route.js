const express = require("express");

const {
    identifierUtilisateur,
    authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const {
    getDemandes,
    createMessage,
    createReclamation,
    createSignalement,
} = require("../controllers/service_client.controller");

const {
    createMessageSchema,
    createReclamationSchema,
    createSignalementSchema,
    getDemandeSchema,
    validate,
} = require("../validators/service_client.validator");

const routerServiceClient = express.Router();

/**
 * Envoie un message au service client.
 */
routerServiceClient.post(
    "/sendMessage",
    identifierUtilisateur,
    validate(createMessageSchema),
    createMessage
);

/**
 * Envoie une réclamation au service client.
 */
routerServiceClient.post(
    "/sendReclamation",
    identifierUtilisateur,
    validate(createReclamationSchema),
    createReclamation
);

/**
 * Envoie un signalement au service client.
 */
routerServiceClient.post(
    "/sendSignalement",
    identifierUtilisateur,
    validate(createSignalementSchema),
    createSignalement
);

/**
 * Récupère les demandes du client connecté.
 */
routerServiceClient.get(
    "/getDemande",
    authBailleurLocataireAdmin,
    validate(getDemandeSchema, "query"),
    getDemandes
);

module.exports = {
    routerServiceClient,
};