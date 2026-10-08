const express = require("express");

const {
    getDataLocataire,
    getProfilLocataire,
    updateLocataire,
    deleteLocataire,
} = require("../controllers/locataire.controller");

const {
    authLocataire,
    authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const routerLocataire = express.Router();

/**
 * Récupère les données du locataire connecté.
 *
 * GET /locataire/getData
 */
routerLocataire.get(
    "/getData",
    authLocataire,
    getDataLocataire
);

/**
 * Récupère le profil d'un locataire.
 *
 * GET /locataire/profil/:id
 */
routerLocataire.get(
    "/profil/:id",
    authBailleurLocataireAdmin,
    getProfilLocataire
);

/**
 * Met à jour les données du locataire connecté.
 *
 * PATCH /locataire/update/data
 */
routerLocataire.patch(
    "/update/data",
    authLocataire,
    updateLocataire
);

/**
 * Supprime le compte du locataire connecté.
 *
 * DELETE /locataire/delete
 */
routerLocataire.delete(
    "/delete",
    authLocataire,
    deleteLocataire
);

module.exports = {routerLocataire,};