const express = require("express");

const {
    identifierUtilisateur,
} = require("../middlewares/auth");

const {
    createDepot,
    searchStatusPaiement,
} = require("../controllers/paiement.controller");

const {
    createDepotSchema,
    searchStatusPaiementSchema,
    validate,
} = require("../validators/paiement.validator");

const routerPaiement = express.Router();

/**
 * Initialise un paiement.
 */
routerPaiement.post(
    "/create",
    identifierUtilisateur,
    validate(createDepotSchema),
    createDepot
);

/**
 * Vérifie le statut d'un paiement.
 */
routerPaiement.post(
    "/check-status",
    identifierUtilisateur,
    validate(searchStatusPaiementSchema),
    searchStatusPaiement
);

module.exports = {
    routerPaiement,
};