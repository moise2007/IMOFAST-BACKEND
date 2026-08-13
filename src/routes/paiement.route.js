const express = require("express")
const { authBailleurLocataireAdmin } = require("../middlewares/auth")
const { createDepot } = require("../controllers/paiement/createDepot")
const { searchStatusPaiement } = require("../controllers/paiement/verifieReceive")

const routerPaiement = express.Router()

routerPaiement.post("/create",authBailleurLocataireAdmin,createDepot)

routerPaiement.post("/check-status",authBailleurLocataireAdmin,searchStatusPaiement)

module.exports = { routerPaiement }