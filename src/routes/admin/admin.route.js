const express = require("express")
const { routerAuthAdmin } = require("./auth.route")
const { routerProfilAdmin } = require("./profil.route")
const { routerSignalementAdmin } = require("./signalement.route")
const { authAdmin } = require("../../middlewares/auth")
const { routerBienAdmin } = require("./bien.route")
const { routerStatistiquesAdmin } = require("./statistiques.route")
const ctrl = require("../../controllers/admin/adminDashbord.controller");
 

//creation du router
const routerAdmin = express.Router()

routerAdmin.use("/auth",routerAuthAdmin)
routerAdmin.use("/bien",routerBienAdmin)
routerAdmin.use("/signalement",routerSignalementAdmin)
routerAdmin.use("/profil",routerProfilAdmin)
routerAdmin.use("/statistique",routerStatistiquesAdmin)


routerAdmin.use(authAdmin);
 
routerAdmin.get("/dashboard", ctrl.dashboard);
// routerAdmin.get("/inscriptions", ctrl.inscriptions);
 
// routerAdmin.get("/", ctrl.lister);
// routerAdmin.post("/", ctrl.creer);
 
// routerAdmin.get("/:id", ctrl.obtenir);
// routerAdmin.put("/:id", ctrl.modifier);
// routerAdmin.patch("/:id/status", ctrl.changerStatut);
// routerAdmin.patch("/:id/verify", ctrl.verifier);
// routerAdmin.delete("/:id", ctrl.supprimer);

module.exports = {routerAdmin}