const { formaterObjet } = require("../../utils/clearData");

const bienRepository = require("../../repositories/bien.repository");

const SPECIAL_TYPES = [
  "bureau",
  "boutique",
  "terrain",
];

/**
 * Champs qui ne doivent jamais être modifiés
 * par le client.
 */
const PROTECTED_FIELDS = new Set([
  "idPublic",
  "bailleurId",
  "createdAt",
  "updateAt",
  "vues",
  "_id",
]);

/**
 * Lance une erreur métier.
 *
 * @param {string} message
 * @param {number} statusCode
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
 * Crée un bien.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @param {Object} params.user
 * @param {string} params.role
 * @param {Function} [params.t]
 * @returns {Promise<Object>}
 */
const createBien = async ({
  data,
  user,
  role,
  t,
}) => {
  const bailleurId = user.idPublic;

  const cleanData = formaterObjet(data);

  /**
   * La validation structurelle est faite
   * par Zod.
   */
  const selectedTypes = SPECIAL_TYPES.filter(
    (type) =>
      cleanData[
        `is${type[0].toUpperCase()}${type.slice(1)}`
      ]
  );

  let type = "logement";

  if (selectedTypes.length === 1) {
    type = selectedTypes[0];
  } else if (
    SPECIAL_TYPES.includes(cleanData.type)
  ) {
    type = cleanData.type;
  }

  const bien = {
    ...cleanData,
    bailleurId,
    type,
    exemplaire:
      cleanData.exemplaire ??
      cleanData.exemplaires,
  };

  /**
   * Ces champs servent uniquement à la sélection
   * du type côté client.
   */
  delete bien.isBureau;
  delete bien.isBoutique;
  delete bien.isTerrain;

  const result =
    await bienRepository.createMany([bien]);

  return {
    bien: result[0].bien,
    documentId: result[0].documentId,
  };
};

/**
 * Récupère un bien.
 *
 * @param {Object} params
 * @param {string} params.id
 * @returns {Promise<Object>}
 */
const getBien = async ({
  id,
}) => {
  const result =
    await bienRepository.findByPublicId(id);

  if (!result) {
    createBusinessError(
      "Le bien n'existe pas",
      404
    );
  }

  return result.bien;
};

/**
 * Récupère la liste paginée des biens.
 *
 * @param {Object} params
 * @param {Object} params.filters
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const getBiens = async ({
  filters,
  user,
  role,
}) => {
  const repositoryFilters = {
    ...filters,
  };

  /**
   * Un bailleur ne peut consulter que ses propres biens.
   *
   * L'admin peut utiliser le bailleurId transmis
   * dans les filtres.
   */
  if (role !== "admin") {
    repositoryFilters.bailleurId =
      user.idPublic;
  }

  const result =
    await bienRepository.list(
      repositoryFilters
    );

  const biens = result.items.map(
    ({ bien }) => bien
  );

  const {
    page,
    limit,
    total,
  } = result.pagination;

  const totalPages =
    total === 0
      ? 0
      : Math.ceil(total / limit);

  return {
    biens,

    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage:
        page < totalPages,
      hasPreviousPage:
        page > 1,
    },

    stats: {
      total,
    },
  };
};

/**
 * Modifie un bien.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {Object} params.data
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const updateBien = async ({
  id,
  data,
  user,
  role,
}) => {
  const bailleurId = user.idPublic;

  const current =
    await bienRepository.findByPublicIdAndBailleur({
      idPublic: id,
      bailleurId,
    });

  if (!current) {
    createBusinessError(
      "Le bien n'existe pas",
      404
    );
  }

  const cleanData =
    formaterObjet(data);

  /**
   * Protection contre la modification des
   * champs appartenant au système.
   */
  for (const field of PROTECTED_FIELDS) {
    delete cleanData[field];
  }

  if (
    Object.keys(cleanData).length === 0
  ) {
    createBusinessError(
      "Aucun champ à modifier"
    );
  }

  const result =
    await bienRepository.updateByPublicId({
      idPublic: id,
      bailleurId,
      documentId: current.documentId,
      currentBien: current.bien,
      data: cleanData,
    });

  if (!result) {
    createBusinessError(
      "Le bien n'existe pas",
      404
    );
  }

  return result.bien;
};

/**
 * Supprime un bien ainsi que ses dépendances.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {Object} params.user
 * @returns {Promise<Object>}
 */
const deleteBien = async ({
  id,
  user,
}) => {
  const result =
    await bienRepository.deleteByPublicId({
      idPublic: id,
      bailleurId: user.idPublic,
    });

  if (!result) {
    createBusinessError(
      "Le bien n'existe pas",
      404
    );
  }

  return result;
};

module.exports = {
  createBien,
  getBien,
  getBiens,
  updateBien,
  deleteBien,
};