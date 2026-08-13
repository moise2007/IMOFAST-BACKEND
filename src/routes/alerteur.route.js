const express=require("express")
const {authAdminLocataire, authBailleurLocataireAdmin}=require("../middlewares/auth")
const { createAlerte } = require("../controllers/alertes/create")
const { getDetailAlerte } = require("../controllers/alertes/getdetailAlertes")
const { getAllAlertes } = require("../controllers/alertes/getAllAtertes")
const { deleteAlerte } = require("../controllers/alertes/deleteAlerte")

const routerAlerteur=express.Router()



routerAlerteur.post("/create",authAdminLocataire,createAlerte)

routerAlerteur.get("/get/:id",authBailleurLocataireAdmin,getDetailAlerte)

routerAlerteur.get("/get",authBailleurLocataireAdmin,getAllAlertes)
routerAlerteur.delete("/delete/:id",authAdminLocataire,deleteAlerte)
module.exports={routerAlerteur}