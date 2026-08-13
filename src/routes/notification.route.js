const express = require("express")
const { authBailleurLocataire, authBailleurLocataireAdmin } = require("../middlewares/auth")
const { setLuNotification } = require("../controllers/notifications/setLuNotifications")
const { setAllLuNotification } = require("../controllers/notifications/setAllLuNotifications")
const { deleteNotification } = require("../controllers/notifications/deleteNotification")
const { getNotification } = require("../controllers/notifications/getAllNotifications")
const { createNotification } = require("../controllers/notifications/createNotification")

//creation du router
const routerNotification = express.Router()


/**
 * route de creation des notifications
 * params : 
 * body : { destinataireId, typeDestinataire, type, cibleId, typeCible, titre, message,}
 * query : 
*/
routerNotification.post("/create",authBailleurLocataireAdmin,createNotification)

/**
 * route recuperation des notifications
 * params : 
 * body : 
 * query : 
*/
routerNotification.get("/",authBailleurLocataireAdmin,getNotification)

/**
 * route de supression des notifications
 * params : Id
 * body : 
 * query : 
*/
routerNotification.delete("/delete/:id",authBailleurLocataireAdmin,deleteNotification)

/**
 * route qui  marque toutes les notfications comme lu
 * params : 
 * body : 
 * query : 
*/
routerNotification.patch("/set-as-all-read",authBailleurLocataireAdmin,setAllLuNotification)

/**
 * route aui marque une notification comment lu
 * params : id
 * body : 
 * query : 
*/

routerNotification.patch("/set-as-read/:id",authBailleurLocataireAdmin,setLuNotification)

module.exports = {routerNotification}