const { createId } = require("@paralleldrive/cuid2");

const { Note } = require("../../models/note");
const noteRepository = require("../../repositories/note.repository");
const { emptyNotes } = require("../../utils/notesDistribution");

const createBusinessError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const VALID_TYPES = ["annonce", "locataire", "bailleur"];

const assertTypeCible = (typeCible) => {
  if (!VALID_TYPES.includes(typeCible)) {
    createBusinessError(
      "errors:backend.invalidInput",
      400
    );
  }
};

/**
 * Voter sur une cible (créer / modifier / supprimer si valeur = 0).
 * C'est le point d'entrée principal : met à jour la collection `note`
 * ET l'agrégat `notes` de la cible via le repository.
 */
const voter = async ({ data, user }) => {
  const { typeCible, cibleId, valeur } = data;
  const auteurId = user.idPublic;

  assertTypeCible(typeCible);
  if (!cibleId) createBusinessError("errors:backend.invalidInput", 400);

  if (!Number.isInteger(valeur) || valeur < 0 || valeur > 5) {
    createBusinessError(
      "errors:backend.invalidInput",
      400
    );
  }

  const result = await noteRepository.voter({
    role: user.role,
    typeCible,
    cibleId,
    auteurId,
    valeur,
  });

  if (result.action === "noop") {
    return { action: "noop", notes: result.notes, vote: null };
  }

  return result;
};

/**
 * Créer une note (refuse si l'utilisateur a déjà noté la cible).
 * Passe par `voter()` pour maintenir l'agrégat de la cible.
 */
const createNote = async ({ data, user }) => {
  const auteurId = user.idPublic;
  const { typeCible, cibleId, valeur } = data;

  assertTypeCible(typeCible);
  if (!cibleId) createBusinessError("errors:backend.invalidInput", 400);
  if (!Number.isInteger(valeur) || valeur < 1 || valeur > 5) {
    createBusinessError("errors:backend.invalidInput", 400);
  }

  const existing = await noteRepository.findByAuteurAndCible({
    auteurId,
    cibleId,
    typeCible,
  });

  if (existing) {
    createBusinessError(
      "errors:backend.alreadyRated",
      409
    );
  }

  const result = await noteRepository.voter({
    role: user.role,
    typeCible,
    cibleId,
    auteurId,
    valeur,
  });

  return result;
};

/**
 * Liste paginée des notes.
 */
const getNotes = async ({ filters, user, role }) => {
  const repositoryFilters = { ...filters };

  if (filters.typeCible) assertTypeCible(filters.typeCible);

  if (role !== "admin") {
    repositoryFilters.auteurId = user.idPublic;
  }

  return noteRepository.findAll(repositoryFilters);
};

/**
 * Récupérer une note par son id public.
 */
const getNote = async ({ idPublic, user, role }) => {
  const result = await noteRepository.findByPublicId(idPublic);

  if (!result) createBusinessError("errors:backend.notFound", 404);

  if (role !== "admin" && result.note.auteurId !== user.idPublic) {
    createBusinessError(
      "errors:backend.forbidden",
      403
    );
  }

  return result.note;
};

/**
 * Note de l'utilisateur connecté sur une cible.
 */
const getMaNote = async ({ cibleId, typeCible, user }) => {
  assertTypeCible(typeCible);
  if (!cibleId) createBusinessError("errors:backend.invalidInput", 400);

  const result = await noteRepository.findByAuteurAndCible({
    auteurId: user.idPublic,
    cibleId,
    typeCible,
  });

  return result ? result.note : null;
};

/**
 * Modifier sa note (via `voter`, pour maintenir l'agrégat de la cible).
 */
const updateNote = async ({ idPublic, valeur, user }) => {
  if (!Number.isInteger(valeur) || valeur < 1 || valeur > 5) {
    createBusinessError("errors:backend.invalidInput", 400);
  }

  const result = await noteRepository.findByPublicIdAndAuteur({
    idPublic,
    auteurId: user.idPublic,
  });

  if (!result) createBusinessError("errors:backend.notFound", 404);

  const { cibleId, typeCible } = result.note;

  const vote = await noteRepository.voter({
    role: user.role,
    typeCible,
    cibleId,
    auteurId: user.idPublic,
    valeur,
  });

  return vote;
};

/**
 * Supprimer sa note (via `voter` avec valeur = 0).
 */
const deleteNote = async ({ idPublic, user }) => {
  const result = await noteRepository.findByPublicIdAndAuteur({
    idPublic,
    auteurId: user.idPublic,
  });

  if (!result) createBusinessError("errors:backend.notFound", 404);

  const { cibleId, typeCible } = result.note;

  return noteRepository.voter({
    role: user.role,
    typeCible,
    cibleId,
    auteurId: user.idPublic,
    valeur: 0,
  });
};

/**
 * Supprimer sa note sur une cible (sans connaître l'idPublic).
 */
const supprimerMaNote = async ({ cibleId, typeCible, user }) => {
  assertTypeCible(typeCible);
  if (!cibleId) createBusinessError("errors:backend.invalidInput", 400);

  const result = await noteRepository.voter({
    role: user.role,
    typeCible,
    cibleId,
    auteurId: user.idPublic,
    valeur: 0,
  });

  if (result.action === "noop") {
    createBusinessError("errors:backend.notFound", 404);
  }

  return result;
};

/**
 * Répartition des notes d'une cible : [{ note, nombre }].
 */
const getNotesAgregat = async ({ cibleId, typeCible }) => {
  assertTypeCible(typeCible);
  if (!cibleId) createBusinessError("errors:backend.invalidInput", 400);

  const result = await noteRepository.findByCible({ cibleId, typeCible });

  if (!result) return emptyNotes();

  return result.note;
};

module.exports = {
  voter,
  createNote,
  getNotes,
  getNote,
  getMaNote,
  updateNote,
  deleteNote,
  supprimerMaNote,
  getNotesAgregat,
};
