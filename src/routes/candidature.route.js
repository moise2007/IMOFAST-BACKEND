const express = require("express")
const { authAdminLocataire, authBailleurAdmin, authBailleurLocataireAdmin } = require("../middlewares/auth")
const { annulerCandidature } = require("../controllers/candidatures/annulerCandidature")
const { acceptCandidature } = require("../controllers/candidatures/acceptcandidature")
const { getDetailCandidature } = require("../controllers/candidatures/detailscandidature")
const { refuserCandidature } = require("../controllers/candidatures/refusCandidature")
const {createCandidature} = require("../controllers/candidatures/createCandidature")
const { getAllCandidature } = require("../controllers/candidatures/getALlCandidatures")
const { updateCandidature } = require("../controllers/candidatures/updateCandidature")
const { deleteCandidature } = require("../controllers/candidatures/deleteCandidature")
const { programmerCandidature } = require("../controllers/candidatures/reprogrammerCandidature")
//creation du router
const routerCandidature = express.Router()

/**
 * route de creation d'une candidature
 * params : 
 * body : {bailleurId, type,  message, visite, demande, bienId}
 * query : 
 */
routerCandidature.post("/create",authAdminLocataire,createCandidature)

/**
 * route de annulation des candidatures
 * params : id(candidature)
 * body : 
 * query : 
 */
routerCandidature.put("/set-annuler/:id",authBailleurLocataireAdmin,annulerCandidature)

/**
 * route de l'acceptation d'une candidature
 * params : id (candidature)
 * body : 
 * query : 
 */
routerCandidature.put("/set-accept/:id",authBailleurAdmin,acceptCandidature)


/**
 * route de refuser la candidature
 * params : id (candidature)
 * body : 
 * query : 
 */
routerCandidature.put("/set-refus/:id",authBailleurAdmin,refuserCandidature)


/**
 * route de refuser la candidature
 * params : id (candidature)
 * body : {time,date}
 * query : 
 */
routerCandidature.put("/set-newDate/:id",authBailleurAdmin,programmerCandidature)
/**
 * route de chargement des details d'une candidature
 * params : id (candidature)
 * body : 
 * query : 
 */
routerCandidature.get("/get/:id",authBailleurLocataireAdmin,getDetailCandidature)

/**
 * route de creation d'une candidature
 * params : 
 * body : 
 * query : {bienId,type,statut,vu,maxDate,minDate,page,limit}
 */
routerCandidature.get("/get",authBailleurLocataireAdmin, getAllCandidature)

/**
 * route de creation d'une candidature
 * params : id
 * body : {objet demande ou objet visite}
 * query : 
 */
routerCandidature.patch("/update",authAdminLocataire,updateCandidature)


routerCandidature.delete("/delete/:id",authBailleurLocataireAdmin,deleteCandidature)

module.exports = {routerCandidature}