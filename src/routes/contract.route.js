const express = require("express")
const { authBailleur, authBailleurAdmin, authBailleurLocataireAdmin, authAdminLocataire } = require("../middlewares/auth")
const { createContrat } = require("../controllers/contrat/createContract")
const { deleteContrat } = require("../controllers/contrat/deleteContract")
const { getDetailContrat } = require("../controllers/contrat/detailContrat")
const { getContrat } = require("../controllers/contrat/getAllCantrat")
const { updateContrat } = require("../controllers/contrat/updateContract")
const { updateStatutContrat } = require("../controllers/contrat/updateStatusContrat")
const { approveContrat } = require("../controllers/contrat/acceptContract")

//creation du router
const routerContrat = express.Router()

/**
 * route de creation d'un contrat
 * params: 
 * body : { locataireId, bienId, dateDebut, dateFin }
 * query : 
*/
routerContrat.post("/create",authBailleurAdmin,createContrat)

/**
 * route de suppression d'un contrat
 * params: id (contrat)
 * body :
 * query : 
*/
routerContrat.delete("/delete/:id",authBailleurAdmin,deleteContrat)


/**
 * route de recuperation des details d'un contract
 * params: id (contract)
 * body :
 * query : 
*/
routerContrat.get("/detail/:id",authBailleurAdmin,getDetailContrat)

/**
 * route de recuperation des contract
 * params: 
 * body :
 * query : { dateFin, dateDebut, page, limit, bienId, bailleurId, locataireId, statut }
*/
routerContrat.get("/",authBailleurLocataireAdmin,getContrat)


/**
 * route de modification d'un contract
 * params: id(contract)
 * body : { dateDebut, dateFin }
 * query : 
*/
routerContrat.patch("/update/:id",authBailleurAdmin,updateContrat)

/**
 * route de modification du status d'un contract
 * params: id(contrat)
 * body : { statut } 
 * query : 
*/
routerContrat.patch("/update/status/:id",authBailleurAdmin,updateStatutContrat)

/**
 * route de acceptation du status d'un contract
 * params: id(contrat)
 * body : {isProuved}
 * query : 
*/
routerContrat.patch("/update/aprouved/:id",authAdminLocataire,approveContrat)


module.exports = {routerContrat}