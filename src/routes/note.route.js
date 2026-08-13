const express = require("express")
const { authBailleurLocataireAdmin } = require("../middlewares/auth")
const { createNote } = require("../controllers/note/createNote")
const { deleteNote } = require("../controllers/note/deleteNote")
const { updateNote } = require("../controllers/note/updateNote")
const { getNote } = require("../controllers/note/getNotes")

//creation du router
const routerNote = express.Router()

/**
 * route de creation d'un note
 * params : 
 * body: {cibleId, typeCible, valeur,}
 * query: 
*/
routerNote.post("/create",authBailleurLocataireAdmin,createNote)


/**
 * route de suppression d'une note
 * params : id
 * body: 
 * query: 
*/
routerNote.delete("/:id",authBailleurLocataireAdmin,deleteNote)


/**
 * route modication d'une note
 * params : id
 * body: {valeur}
 * query: 
*/
routerNote.patch("/update/:id",authBailleurLocataireAdmin,updateNote)


/**
 * route de recuperation d'une note
 * params : 
 * body: 
 * query: {cibleId, typeCible, valeur, idPublic, auteurId,min,max }
*/
routerNote.get("/",getNote)



module.exports = {routerNote}