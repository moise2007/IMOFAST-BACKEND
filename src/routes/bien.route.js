const express = require("express");

const {
  authBailleurLocataireAdmin,
  authBailleurAdmin,
} = require("../middlewares/auth");

const bienController = require("../controllers/bien.controller");

const {
  validate,
  getBiensSchema,
  getBienSchema,
  updateBienSchema,
  deleteBienSchema,
  validateCreateBien,
} = require("../validators/bien.validator");

const routerBien = express.Router();

/**
 * Créer un bien.
 */
routerBien.post(
  "/",
  authBailleurAdmin,
  validateCreateBien,
  bienController.createBienBailleur
);

/**
 * Récupérer les statisques sur les biens bailleur
 */
routerBien.get(
  "/stats",
  authBailleurAdmin,
  bienController.getStatsBiensBailleur
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