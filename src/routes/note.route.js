const express = require("express");

const { authBailleurLocataireAdmin } = require("../middlewares/auth");
const noteController = require("../controllers/note.controller");

const {
  validate,
  voterSchema,
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  maNoteQuerySchema,
  agregatQuerySchema,
  getNotesSchema,
} = require("../validators/note.validator");

const routerNote = express.Router();

/**
 * POST /notes
 * Créer / modifier / supprimer (valeur = 0) en une seule API.
 */
routerNote.post(
  "/",
  authBailleurLocataireAdmin,
  validate(voterSchema),
  noteController.voter
);

/**
 * POST /notes/create
 * Création stricte (409 si déjà voté sur la cible).
 */
routerNote.post(
  "/create",
  authBailleurLocataireAdmin,
  validate(createNoteSchema),
  noteController.createNote
);

/**
 * GET /notes/ma-note?cibleId=...&typeCible=...
 */
routerNote.get(
  "/ma-note",
  authBailleurLocataireAdmin,
  validate(maNoteQuerySchema, "query"),
  noteController.getMaNote
);

/**
 * GET /notes/agregat?cibleId=...&typeCible=...
 */
routerNote.get(
  "/agregat",
  authBailleurLocataireAdmin,
  validate(agregatQuerySchema, "query"),
  noteController.getNotesAgregat
);

/**
 * GET /notes
 */
routerNote.get(
  "/",
  authBailleurLocataireAdmin,
  validate(getNotesSchema, "query"),
  noteController.getNotes
);

/**
 * GET /notes/:id
 */
routerNote.get(
  "/:id",
  authBailleurLocataireAdmin,
  validate(noteIdSchema, "params"),
  noteController.getNote
);

/**
 * PATCH /notes/:id
 */
routerNote.patch(
  "/:id",
  authBailleurLocataireAdmin,
  validate(noteIdSchema, "params"),
  validate(updateNoteSchema),
  noteController.updateNote
);

/**
 * DELETE /notes/:id
 */
routerNote.delete(
  "/ma-note",
  authBailleurLocataireAdmin,
  validate(maNoteQuerySchema, "query"),
  noteController.supprimerMaNote
);

/**
 * DELETE /notes/ma-note?cibleId=...&typeCible=...
 */
routerNote.delete(
  "/:id",
  authBailleurLocataireAdmin,
  validate(noteIdSchema, "params"),
  noteController.deleteNote
);

module.exports = { routerNote };
