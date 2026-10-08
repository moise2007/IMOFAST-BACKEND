const express = require("express");

const {
  authAdminLocataire,
  authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const bienController = require("../controllers/bien.controller");

const {
  validate,
  createBienSchema,
  getBiensSchema,
  getBienSchema,
  updateBienSchema,
  deleteBienSchema,
} = require("../validators/bien.validator");

const routerBien = express.Router();

/**
 * Créer un bien.
 */
routerBien.post(
  "/",
  authAdminLocataire,
  validate(createBienSchema),
  bienController.createBienBailleur
);

/**
 * Récupérer la liste des biens.
 */
routerBien.get(
  "/",
  authBailleurLocataireAdmin,
  validate(getBiensSchema, "query"),
  bienController.getAllBien
);

/**
 * Récupérer le détail d'un bien.
 */
routerBien.get(
  "/:id",
  authBailleurLocataireAdmin,
  validate(getBienSchema, "params"),
  bienController.getDetailBien
);

/**
 * Modifier un bien.
 */
routerBien.patch(
  "/:id",
  authBailleurLocataireAdmin,
  validate(getBienSchema, "params"),
  validate(updateBienSchema),
  bienController.updateBienBailleur
);

/**
 * Supprimer un bien.
 */
routerBien.delete(
  "/:id",
  authBailleurLocataireAdmin,
  validate(deleteBienSchema, "params"),
  bienController.deleteBienBailleur
);

module.exports = {
  routerBien,
};