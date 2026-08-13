const express = require("express")
const { createAnnonceBailleur } = require("../controllers/annonce.js/createAnnonce")
const { authBailleurAdmin, identifierUtilisateur } = require("../middlewares/auth")
const { deleteAnnonceBailleur } = require("../controllers/annonce.js/deleteAnnonce")
const { detailAnnonce } = require("../controllers/annonce.js/detailAnnoces")
const { getAllAnnonce } = require("../controllers/annonce.js/getAllAnnonce")
const { updateAnnonceBailleur } = require("../controllers/annonce.js/updateAnnonce")

//creation du router
const routerAnnonce = express.Router()

//route de creation d'une annonnce
routerAnnonce.post("/create",authBailleurAdmin,createAnnonceBailleur)

//route de suppression d'une annonce
routerAnnonce.delete("/delete/:id",authBailleurAdmin,deleteAnnonceBailleur)

//route de recuperation des details d'une annoce
routerAnnonce.get("/:id",identifierUtilisateur,detailAnnonce)

//route de recupetation des annonces
routerAnnonce.get("/",identifierUtilisateur,getAllAnnonce)

//route de modification d'une annonce
routerAnnonce.patch("/update/:id",authBailleurAdmin,updateAnnonceBailleur)

module.exports = {routerAnnonce}