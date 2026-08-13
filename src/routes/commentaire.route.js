const express = require("express")
const { authBailleurLocataireAdmin } = require("../middlewares/auth")
const { createCommentaire } = require("../controllers/commentaires/createCommentaire")
const { deleteCommentaire } = require("../controllers/commentaires/delete")
const { getCommentaire } = require("../controllers/commentaires/getCommentaire")
const { responseCommentaire } = require("../controllers/commentaires/repondre")
const { updateCommentaire } = require("../controllers/commentaires/update")

//creation du router
const routerCommentaire = express.Router()

/**
 * router de creation d'un commentaire
 * params : 
 * body : cibleId, typeCible, message,
 * query : 
 */
routerCommentaire.post("/create",authBailleurLocataireAdmin,createCommentaire)

/**
 * router de suppression d'un commentaire
 * params : id(commentaire)
 * body :
 * query : 
 */
routerCommentaire.delete("/delete/:id",authBailleurLocataireAdmin,deleteCommentaire)

/**
 * router de recuperation des commentaires
 * params : {col,id}
 * body :
 * query : { page}
 */
routerCommentaire.get("/:col/:id",getCommentaire)

/**
 * router de responses a un commentaire
 * params : id(commentaire)
 * body : {message,}
 * query : 
 */
routerCommentaire.patch("/response/:id",authBailleurLocataireAdmin,responseCommentaire)


/**
 * router de modification d'un commentaire
 * params : 
 * body : {message}
 * query : 
 */
routerCommentaire.patch("/update",authBailleurLocataireAdmin,updateCommentaire)



module.exports = {routerCommentaire}