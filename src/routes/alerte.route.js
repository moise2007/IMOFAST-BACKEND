const express=require("express")
const {authAdminLocataire, authBailleurLocataireAdmin}=require("../middlewares/auth")

const alerteController = require("../controllers/alerte.controller");
const {
  validate,
  createAlerteSchema,
  getAlertesSchema,
  deleteAlerteSchema,
  getAlerteSchema,
  updateAlerteSchema
} = require("../validators/alerte.validator");
const routerAlerteur=express.Router()



/* new version */
routerAlerteur.post("/",authAdminLocataire, validate(createAlerteSchema), alerteController.createAlerte);
routerAlerteur.get("/",authBailleurLocataireAdmin, validate(getAlertesSchema, "query"), alerteController.getAlertes);
routerAlerteur.delete("/:id", authAdminLocataire, validate(deleteAlerteSchema, "params"), alerteController.deleteAlerte)
routerAlerteur.get("/:id",authBailleurLocataireAdmin, validate(getAlerteSchema, "params"), alerteController.getAlerte);
routerAlerteur.patch("/:id", authAdminLocataire, validate(getAlerteSchema, "params"), validate(updateAlerteSchema), alerteController.updateAlerte);

module.exports={routerAlerteur}
