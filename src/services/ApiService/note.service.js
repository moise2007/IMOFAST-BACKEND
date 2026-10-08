const { createId } = require("@paralleldrive/cuid2");

const { Note } = require("../../models/note");

const noteRepository = require("../../repositories/note.repository");

/**
 * Crée une erreur métier.
 *
 * @param {string} message
 * @param {number} [statusCode=400]
 * @throws {Error}
 */
const createBusinessError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  throw error;
};

/**
 * Crée une nouvelle note.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @param {Object} params.user
 * @returns {Promise<Object>}
 */
const createNote = async ({ data, user }) => {
  const auteurId = user.idPublic;

  /**
   * Une personne ne doit normalement avoir qu'une seule
   * note par cible.
   */
  const existingNote =
    await noteRepository.findByAuteurAndCible({
      auteurId,
      cibleId: data.cibleId,
      typeCible: data.typeCible,
    });

  if (existingNote) {
    createBusinessError(
      "Vous avez déjà attribué une note à cette cible.",
      409
    );
  }

  const note = new Note({
    idPublic: createId(),
    auteurId,
    cibleId: data.cibleId,
    typeCible: data.typeCible,
    valeur: data.valeur,
  });

  const result = await noteRepository.create(
    note.toFirebase()
  );

  return result.note;
};

/**
 * Récupère les notes selon les filtres.
 *
 * @param {Object} params
 * @param {Object} params.filters
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const getNotes = async ({
  filters,
  user,
  role,
}) => {
  const repositoryFilters = {
    ...filters,
  };

  /**
   * Un utilisateur classique ne peut consulter
   * que ses propres notes.
   *
   * L'administrateur peut consulter toutes les notes.
   */
  if (role !== "admin") {
    repositoryFilters.auteurId = user.idPublic;
  }

  return noteRepository.findAll(repositoryFilters);
};

/**
 * Récupère une note par son identifiant public.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const getNote = async ({
  idPublic,
  user,
  role,
}) => {
  const result =
    await noteRepository.findByPublicId(idPublic);

  if (!result) {
    createBusinessError(
      "La note n'existe pas.",
      404
    );
  }

  if (
    role !== "admin" &&
    result.note.auteurId !== user.idPublic
  ) {
    createBusinessError(
      "Vous n'êtes pas autorisé à consulter cette note.",
      403
    );
  }

  return result.note;
};

/**
 * Modifie une note.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {number} params.valeur
 * @param {Object} params.user
 * @returns {Promise<Object>}
 */
const updateNote = async ({
  idPublic,
  valeur,
  user,
}) => {
  const result =
    await noteRepository.findByPublicIdAndAuteur({
      idPublic,
      auteurId: user.idPublic,
    });

  if (!result) {
    createBusinessError(
      "La note n'existe pas.",
      404
    );
  }

  const updated =
    await noteRepository.update({
      documentId: result.documentId,
      data: {
        valeur,
      },
    });

  return updated.note;
};

/**
 * Supprime une note.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {Object} params.user
 * @returns {Promise<void>}
 */
const deleteNote = async ({
  idPublic,
  user,
}) => {
  const result =
    await noteRepository.findByPublicIdAndAuteur({
      idPublic,
      auteurId: user.idPublic,
    });

  if (!result) {
    createBusinessError(
      "La note n'existe pas.",
      404
    );
  }

  await noteRepository.delete({
    documentId: result.documentId,
  });
};

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
};