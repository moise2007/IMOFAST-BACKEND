const { createId } = require("@paralleldrive/cuid2");

const { Favori } = require("../../models/favoris");
const favoriRepository = require("../../repositories/favori.repository");

/**
 * Ajoute une annonce aux favoris du locataire.
 *
 * @param {Object} params
 * @param {string} params.annonceId
 * @param {string} params.locataireId
 * @returns {Promise<Object>}
 */
const createFavori = async ({
  annonceId,
  locataireId,
}) => {
  /**
   * 1. Vérifier que l'annonce existe.
   */
  const annonce =
    await favoriRepository.findAnnonceByPublicId(
      annonceId
    );

  if (!annonce) {
    const error = new Error(
      "Annonce introuvable"
    );

    error.statusCode = 404;
    error.code = "not_found";

    throw error;
  }

  /**
   * 2. Vérifier que le favori n'existe pas déjà.
   */
  const existingFavori =
    await favoriRepository.findByAnnonceAndLocataire({
      annonceId,
      locataireId,
    });

  if (existingFavori) {
    const error = new Error(
      "Cette annonce est déjà dans vos favoris"
    );

    error.statusCode = 409;
    error.code = "already_favori";

    throw error;
  }

  /**
   * 3. Créer le favori.
   */
  const favori = new Favori({
    locataireId,
    annonceId,
    idPublic: createId(),
  });

  const data = favori.toFirebase();

  const createdFavori =
    await favoriRepository.create(data);

  /**
   * 4. Mettre à jour les statistiques de l'annonce.
   *
   * On le fait seulement après avoir créé le favori.
   */
  await favoriRepository.incrementAnnonceFavoris(
    annonce.id
  );

  return createdFavori.data;
};

/**
 * Supprime un favori du locataire courant.
 *
 * @param {Object} params
 * @param {string} params.favoriId
 * @param {string} params.locataireId
 * @returns {Promise<void>}
 */
const deleteFavori = async ({
  favoriId,
  locataireId,
}) => {
  const favori =
    await favoriRepository.findByIdAndLocataire({
      idPublic: favoriId,
      locataireId,
    });

  if (!favori) {
    const error = new Error(
      "Favori introuvable"
    );

    error.statusCode = 404;
    error.code = "not_found";

    throw error;
  }

  /**
   * Récupérer l'annonce avant de supprimer le favori.
   */
  const annonce =
    await favoriRepository.findAnnonceByPublicId(
      favori.data.annonceId
    );

  /**
   * Supprimer le favori.
   */
  await favoriRepository.delete(favori.id);

  /**
   * Mettre à jour les statistiques uniquement
   * si l'annonce existe encore.
   */
  if (annonce) {
    const currentCount =
      annonce.data.statistiques?.favoris ?? 0;

    await favoriRepository.decrementAnnonceFavoris(
      annonce.id,
      currentCount
    );
  }
};

/**
 * Récupère les favoris du locataire.
 *
 * @param {Object} params
 * @param {string} params.locataireId
 * @param {number} params.page
 * @param {number} params.limit
 * @returns {Promise<Object>}
 */
const getFavoris = async ({
  locataireId,
  page,
  limit,
}) => {
  const favoris =
    await favoriRepository.findAllByLocataire({
      locataireId,
    });

  /**
   * Pagination côté application.
   *
   * Pour un grand volume de favoris, il faudra évoluer
   * vers une pagination Firestore par curseur.
   */
  const start = (page - 1) * limit;
  const end = start + limit;

  const paginatedFavoris =
    favoris.slice(start, end);

  if (!paginatedFavoris.length) {
    return {
      total: favoris.length,
      favoris: [],
    };
  }

  /**
   * Récupération des annonces.
   */
  const annonceIds = paginatedFavoris.map(
    ({ data }) => data.annonceId
  );

  const annonces =
    await favoriRepository.findAnnoncesByPublicIds(
      annonceIds
    );

  /**
   * Indexation des annonces pour éviter
   * un `.find()` à chaque favori.
   */
  const annoncesById = new Map(
    annonces.map((annonce) => [
      annonce.idPublic,
      annonce,
    ])
  );

  /**
   * Récupération des biens liés aux annonces.
   */
  const bienIds = annonces
    .map((annonce) => annonce.bienId)
    .filter(Boolean);

  const biens =
    await favoriRepository.findBiensByPublicIds(
      bienIds
    );

  const biensById = new Map(
    biens.map((bien) => [
      bien.idPublic,
      bien,
    ])
  );

  /**
   * Assemblage final.
   */
  const result = paginatedFavoris
    .map(({ data }) => {
      const annonce =
        annoncesById.get(data.annonceId);

      if (!annonce) {
        return null;
      }

      const bien =
        biensById.get(annonce.bienId);

      if (!bien) {
        return null;
      }

      return {
        ...data,
        annonce,
        bien,
      };
    })
    .filter(Boolean);

  return {
    total: favoris.length,
    favoris: result,
  };
};

module.exports = {
  createFavori,
  deleteFavori,
  getFavoris,
};