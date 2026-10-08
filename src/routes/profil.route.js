const express = require("express");

const {
    authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const {
    getProfil,
} = require("../controllers/profil.controller");

const {
    getProfilSchema,
    validate,
} = require("../validators/profil.validator");

const routerProfil = express.Router();

/**
 * Récupère les informations d'un bailleur ou d'un locataire.
 */
routerProfil.post(
    "/",
    authBailleurLocataireAdmin,
    validate(getProfilSchema),
    getProfil
);

module.exports = {
    routerProfil,
};