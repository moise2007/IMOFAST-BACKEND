const express = require("express")
const { authBailleurLocataireAdmin } = require("../middlewares/auth")
const { createSignalement } = require("../controllers/signalements/createSignalement")
const { updateSignalement } = require("../controllers/signalements/updateSignalement")
const { deleteSignalement } = require("../controllers/signalements/deletesignalement")
const { getSignalement } = require("../controllers/signalements/getSignalement")

//creation du router

const routerSignalement = express.Router()

/**
* route de creation d'un signalement
* body : {typeCible,idCible,raison,description}
* query : 
* params : 
*/
routerSignalement.post("/create",authBailleurLocataireAdmin,createSignalement)

/**
* route de moficiation d'un signalement
* body : {raison,description,cibleId }
* query : 
* params : id
*/
routerSignalement.patch("/update/:id",authBailleurLocataireAdmin,updateSignalement)

/**
* route de suppression d'un signalement
* body : cibleId 
* query : 
* params : id
*/
routerSignalement.delete("/delete/:id",authBailleurLocataireAdmin,deleteSignalement)

/**
* route de recuperation des signalement
* body : 
* query : signalementId,raison,typeCible,cibleId,auteurId
* params : 
*/
routerSignalement.get("/",authBailleurLocataireAdmin,getSignalement)

module.exports = {routerSignalement}