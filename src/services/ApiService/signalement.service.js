const { createId } = require("@paralleldrive/cuid2");

const { Signalement } = require("../../models/signalement");
const signalementRepository = require("../../repositories/signalement.repository");

/**
 * Crée une erreur métier avec un code HTTP.
 *
 * @param {string} message
 * @param {number} statusCode
 * @throws {Error}
 */
const createBusinessError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  throw error;
};

/**
 * Crée un nouveau signalement.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @param {Object} params.user
 * @returns {Promise<Object>}
 */
const createSignalement = async ({ data, user }) => {
  const idAuteur = user.idPublic;

  const duplicate = await signalementRepository.findDuplicate({
    idAuteur,
    idCible: data.idCible,
    typeCible: data.typeCible,
    raison: data.raison,
  });

  if (duplicate) {
    createBusinessError(
      "Vous avez déjà effectué ce signalement.",
      409
    );
  }

  const signalement = new Signalement({
    idPublic: createId(),
    idAuteur,
    idCible: data.idCible,
    typeCible: data.typeCible,
    raison: data.raison,
    description: data.description,
  });

  const result = await signalementRepository.create(
    signalement.toFirebase()
  );

  return result.signalement;
};

/**
 * Récupère la liste des signalements selon les filtres.
 *
 * Un utilisateur classique ne peut consulter que ses propres
 * signalements. L'administrateur peut consulter l'ensemble.
 *
 * @param {Object} params
 * @param {Object} params.filters
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const getSignalements = async ({
  filters,
  user,
  role,
}) => {
  const repositoryFilters = {
    ...filters,
  };

  if (role !== "admin") {
    repositoryFilters.idAuteur = user.idPublic;
  }

  return signalementRepository.findAll(repositoryFilters);
};

/**
 * Récupère un signalement par son identifiant public.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const getSignalement = async ({
  idPublic,
  user,
  role,
}) => {
  const result =
    await signalementRepository.findByPublicId(idPublic);

  if (!result) {
    createBusinessError(
      "Le signalement n'existe pas.",
      404
    );
  }

  if (
    role !== "admin" &&
    result.signalement.idAuteur !== user.idPublic
  ) {
    createBusinessError(
      "Vous n'êtes pas autorisé à consulter ce signalement.",
      403
    );
  }

  return result.signalement;
};

/**
 * Modifie un signalement appartenant à l'utilisateur connecté.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {Object} params.data
 * @param {Object} params.user
 * @returns {Promise<Object>}
 */
const updateSignalement = async ({
  idPublic,
  data,
  user,
}) => {
  const result =
    await signalementRepository.findByPublicIdAndAuteur({
      idPublic,
      idAuteur: user.idPublic,
    });

  if (!result) {
    createBusinessError(
      "Le signalement n'existe pas.",
      404
    );
  }

  if (result.signalement.statut !== "en_attente") {
    createBusinessError(
      "Ce signalement ne peut plus être modifié.",
      409
    );
  }

  const updateData = {
    ...data,
  };

  const updatedAt = new Date();

  updateData.updatedAt = updatedAt;

  const updated =
    await signalementRepository.update({
      documentId: result.documentId,
      data: updateData,
    });

  return updated.signalement;
};

/**
 * Supprime un signalement appartenant à l'utilisateur connecté.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {Object} params.user
 * @returns {Promise<void>}
 */
const deleteSignalement = async ({
  idPublic,
  user,
}) => {
  const result =
    await signalementRepository.findByPublicIdAndAuteur({
      idPublic,
      idAuteur: user.idPublic,
    });

  if (!result) {
    createBusinessError(
      "Le signalement n'existe pas.",
      404
    );
  }

  if (result.signalement.statut !== "en_attente") {
    createBusinessError(
      "Ce signalement ne peut plus être supprimé.",
      409
    );
  }

  await signalementRepository.delete(result.documentId);
};

module.exports = {
  createSignalement,
  getSignalements,
  getSignalement,
  updateSignalement,
  deleteSignalement,
};