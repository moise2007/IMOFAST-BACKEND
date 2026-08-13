const express = require("express")
const { authBailleurLocataireAdmin, authBailleurAdmin } = require("../middlewares/auth")
const { createEvenement } = require("../controllers/agenda/createEvent")
const {  deleteEvenement } = require("../controllers/agenda/deleteEvent")
const { getDetailEvenement } = require("../controllers/agenda/detailEvent")
const { getAllEvenement } = require("../controllers/agenda/getAllEvent")
const { updateEvenement } = require("../controllers/agenda/updateEvent")
const { updateStatutEvenement } = require("../controllers/agenda/updateStatusEvent")

//creation du router
const routerAgenda = express.Router()

/**
 * route creation des evenements
 * params : 
 * body : {idBien, idLocataire, type, titre, start, heure, duree, end, description}
 * query : 
*/
routerAgenda.post("/create",authBailleurLocataireAdmin,createEvenement)


/**
 * route de suspression d'un evennement
 * params : id(event)
 * body : 
 * query : 
*/
routerAgenda.delete("/:id",authBailleurLocataireAdmin,deleteEvenement)

/**
 * route de deltail d'une evenement
 * params : id(event)
 * body : 
 * query : 
*/
routerAgenda.get("get-one/:id",authBailleurLocataireAdmin,getDetailEvenement)

/**
 * route de recuperation de plusieurs evenement
 * params : 
 * body : 
 * query : 
*/
routerAgenda.get("/",authBailleurLocataireAdmin,getAllEvenement)


/**
 * route de modification d'un evenement
 * params : 
 * body : 
 * query : 
*/
routerAgenda.patch("/update/:id",authBailleurAdmin,updateEvenement)


/**
 * route de changement du status d'un evenement
 * params : 
 * body : 
 * query : 
*/
routerAgenda.patch("/update-status/:id",authBailleurAdmin,updateStatutEvenement)

module.exports = {routerAgenda}