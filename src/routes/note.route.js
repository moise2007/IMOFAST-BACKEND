const express = require("express");

const {
  authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const noteController = require("../controllers/note.controller");

const {
  validate,
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  getNotesSchema,
} = require("../validators/note.validator");

const routerNote = express.Router();

/**
 * Créer une note.
 *
 * POST /notes
 */
routerNote.post(
  "/",
  authBailleurLocataireAdmin,
  validate(createNoteSchema),
  noteController.createNote
);

/**
 * Récupérer les notes avec filtres.
 *
 * GET /notes
 */
routerNote.get(
  "/",
  authBailleurLocataireAdmin,
  validate(getNotesSchema, "query"),
  noteController.getNotes
);

/**
 * Récupérer une note par son identifiant public.
 *
 * GET /notes/:id
 */
routerNote.get(
  "/:id",
  authBailleurLocataireAdmin,
  validate(noteIdSchema, "params"),
  noteController.getNote
);

/**
 * Modifier une note.
 *
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
 * Supprimer une note.
 *
 * DELETE /notes/:id
 */
routerNote.delete(
  "/:id",
  authBailleurLocataireAdmin,
  validate(noteIdSchema, "params"),
  noteController.deleteNote
);

module.exports = {
  routerNote,
};