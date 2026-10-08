const { Batiment } = require("../../models/batiment");

const { createId } = require("@paralleldrive/cuid2");

const batimentRepository = require("../../repositories/batiment.repository");

/**
 * Crée un bâtiment.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const createBatiment = async ({ data, user, role }) => {
  const bailleurId = user.idPublic;

  const idPublic = createId();

  const batiment = new Batiment({
    ...data,
    bailleurId,
    role,
  });

  const batimentData = batiment.toFireBase();

  /**
   * On force l'identifiant généré ici afin que le repository
   * ne contienne pas de logique métier.
   */
  batimentData.idPublic = idPublic;

  await batimentRepository.create(batimentData);

  return {
    ...batimentData,
    idPublic,
  };
};

/**
 * Récupère les bâtiments accessibles à l'utilisateur.
 *
 * @param {Object} params
 * @param {Object} params.filters
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const getBatiments = async ({ filters, user, role }) => {
  const result = await batimentRepository.findMany({
    filters,
    userId: user.idPublic,
    role,
  });

  return result;
};

/**
 * Récupère un bâtiment par son identifiant public.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const getBatiment = async ({ id, user, role }) => {
  const batiment = await batimentRepository.findById({
    id,
    userId: user.idPublic,
    role,
  });

  if (!batiment) {
    const error = new Error("Le bâtiment n'existe pas");
    error.statusCode = 404;
    throw error;
  }

  return batiment;
};

/**
 * Modifie un bâtiment.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {Object} params.data
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const updateBatiment = async ({ id, data, user, role }) => {
  const userId = user.idPublic;

  const batiment = await batimentRepository.findById({
    id,
    userId,
    role,
  });

  if (!batiment) {
    const error = new Error("Le bâtiment n'existe pas");
    error.statusCode = 404;
    throw error;
  }

  const updatedData = {
    ...data,
    localisation: {
      ...(batiment.localisation || {}),
      ...(data.ville !== undefined && {
        ville: data.ville,
      }),
      ...(data.quartier !== undefined && {
        quartier: data.quartier,
      }),
      ...(data.pays !== undefined && {
        pays: data.pays,
      }),
      ...(data.lat !== undefined && {
        lat: data.lat,
      }),
      ...(data.lon !== undefined && {
        lon: data.lon,
      }),
      ...(data.adresse !== undefined && {
        adresse: data.adresse,
      }),
    },
  };

  /**
   * Les champs de localisation plats ne doivent pas être
   * enregistrés au niveau racine du document.
   */
  delete updatedData.ville;
  delete updatedData.quartier;
  delete updatedData.pays;
  delete updatedData.lat;
  delete updatedData.lon;
  delete updatedData.adresse;

  const updatedBatiment = await batimentRepository.update({
    id,
    data: updatedData,
  });

  return updatedBatiment;
};

/**
 * Supprime logiquement un bâtiment.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<void>}
 */
const deleteBatiment = async ({ id, user, role }) => {
  const batiment = await batimentRepository.findById({
    id,
    userId: user.idPublic,
    role,
  });

  if (!batiment) {
    const error = new Error("Le bâtiment n'existe pas");
    error.statusCode = 404;
    throw error;
  }

  await batimentRepository.softDelete(id);
};

module.exports = {
  createBatiment,
  getBatiments,
  getBatiment,
  updateBatiment,
  deleteBatiment,
};