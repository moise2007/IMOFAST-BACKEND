const express = require("express")
const {  authBailleurAdmin } = require("../middlewares/auth")
const { createBienBailleur } = require("../controllers/bien/createBien")
const { deleteBienBailleur } = require("../controllers/bien/deleteBien")
const { getAllBien } = require("../controllers/bien/getallBiens")
const { getDetailBien } = require("../controllers/bien/getDetailBien")
const { updateBienBailleur } = require("../controllers/bien/updateBien")

//creation du router
const routerBien = express.Router()

// route de cration d'un bien
routerBien.post("/create",authBailleurAdmin,createBienBailleur)

//route de recuperation des annonces 
routerBien.get("/",authBailleurAdmin,getAllBien)

//router de recuperation d'un bien
routerBien.get("/get-one/:id",getDetailBien)

//route de suppression d'une annonce
routerBien.delete("/delete/:id",authBailleurAdmin,deleteBienBailleur)

// route de modification du bien
routerBien.put("/update/:id",authBailleurAdmin,updateBienBailleur)


module.exports = {routerBien}