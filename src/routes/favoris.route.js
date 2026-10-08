const express = require("express");

const {authLocataire,} = require("../middlewares/auth");

const favoriController = require("../controllers/favori.controller");

const {
  validate,
  annonceIdSchema,
  favoriIdSchema,
  getFavorisSchema,
} = require("../validators/favori.validator");

const routerFavoris = express.Router();

/**
 * Récupère les favoris du locataire.
 *
 * IMPORTANT :
 * Cette route doit être déclarée avant `/:id`.
 */
routerFavoris.get(
  "/",
  authLocataire,
  validate(getFavorisSchema, "query"),
  favoriController.getFavoris
);

/**
 * Ajoute une annonce aux favoris.
 */
routerFavoris.post(
  "/:id",
  authLocataire,
  validate(annonceIdSchema, "params"),
  favoriController.createFavori
);

/**
 * Supprime un favori.
 */
routerFavoris.delete(
  "/:id",
  authLocataire,
  validate(favoriIdSchema, "params"),
  favoriController.deleteFavori
);

module.exports = {
  routerFavoris,
};