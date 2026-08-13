const express = require("express")
const { authBailleurLocataireAdmin } = require("../middlewares/auth")
const { createConversation } = require("../controllers/conversation/createConversation")
const { deleteConversation } = require("../controllers/conversation/deleteConversation")
const { getAllConversation } = require("../controllers/conversation/getAllConversation")
const { getOneConversation } = require("../controllers/conversation/getAnConversation")
const { setLuConversation } = require("../controllers/conversation/setLuConversation")
const { getContact } = require("../controllers/conversation/getContact")

//creation du router
const routerConversation = express.Router()

/**
 * route de creation des conversations
 * params: {auteur1Id}
 * body: 
 * query : 
*/
routerConversation.post("/create/:auteur1Id",authBailleurLocataireAdmin,createConversation)


/**
 * route de suppression d'une conversation
 * params: id
 * body:
 * query
*/
routerConversation.delete('/delete/:id',authBailleurLocataireAdmin,deleteConversation)


/**
 * route  de recuperation de tous les conversations
 * params: 
 * body:
 * query :{limit,page}
*/
routerConversation.get("/",authBailleurLocataireAdmin,getAllConversation)





/**
 * route de marquer une conversation comme lu
 * params: id
 * body:
 * query
*/

routerConversation.patch("/set-lu/:id",authBailleurLocataireAdmin,setLuConversation)


/**
 * route qui permet de recuperer les contacts
 * params: id
 * body:
 * query
*/

routerConversation.get("/get-contacts/",authBailleurLocataireAdmin,getContact)



/**
 * route de recuperation d'une conversation
 * params: id
 * body:
 * query
*/
routerConversation.get("/:id",authBailleurLocataireAdmin,getOneConversation)


module.exports = {routerConversation}