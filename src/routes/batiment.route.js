const express = require("express")
const { authBailleurAdmin } = require("../middlewares/auth")
const { createbatiment } = require("../controllers/batiment/create.controller")
const { deletebatiment } = require("../controllers/batiment/delete.controller")
const { updatebatiment } = require("../controllers/batiment/update.controller")
const { getBatiments } = require("../controllers/batiment/getBatiment.controller")

// creation du router
const batimentRouter = express.Router()

// route de creation d'un batiment
batimentRouter.post("/create",authBailleurAdmin,createbatiment)

// route de suppression d'un batiment
batimentRouter.delete("/delete/:id",authBailleurAdmin, deletebatiment)

// route de modification d'un batiment
batimentRouter.patch("/update/:id",authBailleurAdmin, updatebatiment)

// route de recuperation des batiments
batimentRouter.get("/get",authBailleurAdmin,getBatiments)


module.exports = {batimentRouter}