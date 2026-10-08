const { asyncHandler } = require("../utils/asyncHandler");

const noteService = require("../services/ApiService/note.service");

/**
 * Crée une note.
 *
 * @route POST /notes
 */
const createNote = asyncHandler(async (req, res) => {
  const note = await noteService.createNote({
    data: req.validatedBody,
    user: req.user,
  });

  return res.status(201).json({
    success: true,
    note,
    msg: req.t("success.create_note", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère les notes selon les filtres.
 *
 * @route GET /notes
 */
const getNotes = asyncHandler(async (req, res) => {
  const result = await noteService.getNotes({
    filters: req.validatedQuery,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.get_note", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère une note par son identifiant public.
 *
 * @route GET /notes/:id
 */
const getNote = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  const note = await noteService.getNote({
    idPublic: id,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    note,
  });
});

/**
 * Modifie une note appartenant à l'utilisateur connecté.
 *
 * @route PATCH /notes/:id
 */
const updateNote = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  const note = await noteService.updateNote({
    idPublic: id,
    valeur: req.validatedBody.valeur,
    user: req.user,
  });

  return res.status(200).json({
    success: true,
    note,
    msg: req.t("success.update_note", {
      ns: "responses",
    }),
  });
});

/**
 * Supprime une note appartenant à l'utilisateur connecté.
 *
 * @route DELETE /notes/:id
 */
const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  await noteService.deleteNote({
    idPublic: id,
    user: req.user,
  });

  return res.status(200).json({
    success: true,
    msg: req.t("success.delete_note", {
      ns: "responses",
    }),
  });
});

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
};