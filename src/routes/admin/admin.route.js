const express = require("express")
const { routerAuthAdmin } = require("./auth.route")
const { routerProfilAdmin } = require("./profil.route")
const { routerSignalementAdmin } = require("./signalement.route")
const { authAdmin } = require("../../middlewares/auth")
const { routerBienAdmin } = require("./bien.route")
const { routerStatistiquesAdmin } = require("./statistiques.route")

//creation du router
const routerAdmin = express.Router()

routerAdmin.use("/auth",routerAuthAdmin)
routerAdmin.use("/bien",routerBienAdmin)
routerAdmin.use("/signalement",routerSignalementAdmin)
routerAdmin.use("/profil",routerProfilAdmin)
routerAdmin.use("/statistique",routerStatistiquesAdmin)

module.exports = {routerAdmin}