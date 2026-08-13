const express = require("express")
const { getProfil } = require("../controllers/profils/getProfil")

//creation du router
const routerProfil = express.Router()
/**
 *  router permetant d'obtenir un profil
 * body: {idPublic,role}
 * params:
 * query: 
*/
routerProfil.post("/",getProfil)

module.exports = {routerProfil}