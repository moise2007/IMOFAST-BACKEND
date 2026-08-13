const express = require("express")
const { authBailleurLocataireAdmin } = require("../middlewares/auth")
const { sendMessage } = require("../controllers/message/sendMessage")
const { updateMessage } = require("../controllers/message/updateMessage")
const { deleteMessage } = require("../controllers/message/deleteMessage")
const { getMessage } = require("../controllers/message/getMessageConversation")

//creation du router
const routerMessage = express.Router()

/**
 * route de creation d'un message
 * params: 
 * query: 
 * body : {conversationId, type, contenu, medias, lien,}
*/

routerMessage.post("/create",authBailleurLocataireAdmin,sendMessage)

/**
 * route de modification des messages
 * params: id
 * query: 
 * body : {conversationId, type, contenu,}
*/
routerMessage.patch("/update/:id",authBailleurLocataireAdmin,updateMessage)


/**
 * route de suppresion des messages
 * params: id
 * query: 
 * body : {conversationId,}
*/
routerMessage.delete("/delete/:id",authBailleurLocataireAdmin,deleteMessage)



/**
 * route de recuperations des messages
 * params: id
 * query: {page,limit}
 * body : 
*/

routerMessage.get("/:id",authBailleurLocataireAdmin,getMessage)
module.exports = {routerMessage}