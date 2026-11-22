const { asyncHandler } = require("../utils/asyncHandler");
const noteService = require("../services/ApiService/note.service");

/**
 * POST /notes  → créer ou mettre à jour selon existence
 * (valeur = 0 supprime)
 */
const voter = asyncHandler(async (req, res) => {
  const result = await noteService.voter({
    data: req.validatedBody,
    user: req.user,
  });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.vote_note", { ns: "responses" }),
  });
});

/**
 * POST /notes/create  → création stricte (409 si déjà voté)
 */
const createNote = asyncHandler(async (req, res) => {
  const result = await noteService.createNote({
    data: req.validatedBody,
    user: req.user,
  });

  return res.status(201).json({
    success: true,
    ...result,
    msg: req.t("success.create_note", { ns: "responses" }),
  });
});

/**
 * GET /notes
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
    msg: req.t("success.get_note", { ns: "responses" }),
  });
});

/**
 * GET /notes/:id
 */
const getNote = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  const note = await noteService.getNote({
    idPublic: id,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({ success: true, note });
});

/**
 * GET /notes/ma-note?cibleId=...&typeCible=...
 */
const getMaNote = asyncHandler(async (req, res) => {
  const { cibleId, typeCible } = req.validatedQuery;

  const note = await noteService.getMaNote({
    cibleId,
    typeCible,
    user: req.user,
  });

  return res.status(200).json({ success: true, note });
});

/**
 * GET /notes/agregat?cibleId=...&typeCible=...
 */
const getNotesAgregat = asyncHandler(async (req, res) => {
  const { cibleId, typeCible } = req.validatedQuery;

  const notes = await noteService.getNotesAgregat({ cibleId, typeCible });

  return res.status(200).json({ success: true, notes });
});

/**
 * PATCH /notes/:id
 */
const updateNote = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  const result = await noteService.updateNote({
    idPublic: id,
    valeur: req.validatedBody.valeur,
    user: req.user,
  });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.update_note", { ns: "responses" }),
  });
});

/**
 * DELETE /notes/:id
 */
const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  const result = await noteService.deleteNote({
    idPublic: id,
    user: req.user,
  });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.delete_note", { ns: "responses" }),
  });
});

/**
 * DELETE /notes/ma-note?cibleId=...&typeCible=...
 */
const supprimerMaNote = asyncHandler(async (req, res) => {
  const { cibleId, typeCible } = req.validatedQuery;

  const result = await noteService.supprimerMaNote({
    cibleId,
    typeCible,
    user: req.user,
  });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.delete_note", { ns: "responses" }),
  });
});

module.exports = {
  voter,
  createNote,
  getNotes,
  getNote,
  getMaNote,
  getNotesAgregat,
  updateNote,
  deleteNote,
  supprimerMaNote,
};