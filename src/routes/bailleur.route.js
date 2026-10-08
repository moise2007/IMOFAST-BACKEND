const express = require("express");

const {
    getDataBailleur,
    getDataAccueilBailleur,
    getProfilBailleur,
    updateDataBailleur,
    deleteBailleur,
} = require("../controllers/bailleur.controller");

const {
    authBailleur,
    authBailleurAdmin,
    authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const routerBailleur = express.Router();

/**
 * Récupère les données du bailleur connecté.
 *
 * GET /bailleur/getData
 */
routerBailleur.get(
    "/getData",
    authBailleur,
    getDataBailleur
);

/**
 * Récupère les données d'accueil du bailleur.
 *
 * GET /bailleur/get-data-acceuil
 */
routerBailleur.get(
    "/get-data-acceuil",
    authBailleurAdmin,
    getDataAccueilBailleur
);

/**
 * Récupère le profil d'un bailleur.
 *
 * GET /bailleur/profil/:id
 */
routerBailleur.get(
    "/profil/:id",
    authBailleurLocataireAdmin,
    getProfilBailleur
);

/**
 * Met à jour les données du bailleur connecté.
 *
 * PATCH /bailleur/update/data
 */
routerBailleur.patch(
    "/update/data",
    authBailleur,
    updateDataBailleur
);

/**
 * Supprime le compte du bailleur connecté.
 *
 * DELETE /bailleur/suppression
 */
routerBailleur.delete(
    "/suppression",
    authBailleur,
    deleteBailleur
);

module.exports = {routerBailleur};