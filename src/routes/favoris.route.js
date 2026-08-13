const express = require("express")
const { authAdminLocataire, authBailleurLocataireAdmin } = require("../middlewares/auth")
const { createFavoris } = require("../controllers/favoris/createFavoris")
const { deleteFavoris } = require("../controllers/favoris/deleteFavoris")
const { getFavoris } = require("../controllers/favoris/getFavoris")

//creation du router
const routerFavoris = express.Router()

/**
 * route de creation d'un favoris 
 * params : id(de l'annonce)
 * body : 
 * query : 
 */
routerFavoris.post("/create/:id",authAdminLocataire,createFavoris)



/**
 * route de suppression d'un favoris 
 * params : id(du favoris)
 * body : 
 * query : 
 */
routerFavoris.delete("/delete/:id",authAdminLocataire,deleteFavoris)



/**
 * route de recuperation des favoris 
 * params : 
 * body : 
 * query : {page,limit}
 */
routerFavoris.get("/get",authBailleurLocataireAdmin,getFavoris)

module.exports = {routerFavoris}