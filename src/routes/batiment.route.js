const express = require("express");

const {authBailleurLocataireAdmin,authBailleurAdmin} = require("../middlewares/auth");

const batimentController = require("../controllers/batiment.controller");

const {
  validate,
  createBatimentSchema,
  getBatimentsSchema,
  getBatimentSchema,
  updateBatimentSchema,
  deleteBatimentSchema,
} = require("../validators/batiment.validator");

const routerBatiment = express.Router();

/**
 * Créer un bâtiment.
 */
routerBatiment.post(
  "/",
  authBailleurAdmin,
  validate(createBatimentSchema),
  batimentController.createBatiment
);

/**
 * Récupérer les bâtiments accessibles à l'utilisateur.
 */
routerBatiment.get(
  "/",
  authBailleurLocataireAdmin,
  validate(getBatimentsSchema, "query"),
  batimentController.getBatiments
);

/**
 * Récupérer un bâtiment.
 */
routerBatiment.get(
  "/:id",
  authBailleurLocataireAdmin,
  validate(getBatimentSchema, "params"),
  batimentController.getBatiment
);

/**
 * Modifier un bâtiment.
 */
routerBatiment.patch(
  "/:id",
  authBailleurAdmin,
  validate(getBatimentSchema, "params"),
  validate(updateBatimentSchema),
  batimentController.updateBatiment
);

/**
 * Supprimer un bâtiment.
 */
routerBatiment.delete(
  "/:id",
  authBailleurAdmin,
  validate(deleteBatimentSchema, "params"),
  batimentController.deleteBatiment
);

module.exports = {
  routerBatiment,
};