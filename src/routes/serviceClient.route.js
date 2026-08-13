
const express = require("express")
const { identifierUtilisateur, authBailleurLocataireAdmin } = require("../middlewares/auth")
const { sendMessageServiceClient } = require("../controllers/serviceClient/sendMessage")
const { sendReclamationServiceClient } = require("../controllers/serviceClient/sendReclamation")
const { sendSignalementServiceClient } = require("../controllers/serviceClient/sendSignalement")
const { getDemandeServiceClient } = require("../controllers/serviceClient/getDemande")

const routerServiceClient = express.Router()

routerServiceClient.post("/sendMessage",identifierUtilisateur,sendMessageServiceClient)
routerServiceClient.post("/sendReclamation",identifierUtilisateur,sendReclamationServiceClient)
routerServiceClient.post("/sendSignalement",identifierUtilisateur,sendSignalementServiceClient)
routerServiceClient.get("/getDemande",authBailleurLocataireAdmin,getDemandeServiceClient)

module.exports = {routerServiceClient}