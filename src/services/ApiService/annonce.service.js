const { createId } = require("@paralleldrive/cuid2");

const AppError = require("../../errors/AppError");
const annonceRepository = require("../../repositories/annonce.repository");

const { formaterObjet } = require("../../utils/formaterObjet");
const { createMetaDataAnnonce } = require("../../utils/createMetaDataAnnonce");
const { Annonce } = require("../../models/Annonce");

/**
 * Crée une nouvelle annonce pour un bailleur.
 *
 * Règles métier :
 * - seul un bailleur peut créer une annonce ;
 * - le bien doit appartenir au bailleur connecté ;
 * - un bien ne peut pas avoir plus de deux annonces ;
 * - l'annonce reçoit un identifiant public ;
 * - les métadonnées de l'annonce sont générées avant persistance.
 *
 * @param {Object} params
 * @param {Object} params.data Données envoyées pour créer l'annonce.
 * @param {Object} params.user Utilisateur authentifié.
 * @param {string} params.role Rôle de l'utilisateur.
 * @returns {Promise<Object>} L'annonce créée.
 */
exports.createAnnonce = async ({ data, user, role }) => {
  if (role !== "bailleur") {
    throw new AppError("accès refusé", 403);
  }

  const bailleurId = user.idPublic;
  const { bienId } = data;

  /**
   * Vérifie que le bien appartient bien au bailleur connecté.
   */
  const bien = await annonceRepository.findBienByIdAndBailleur(
    bienId,
    bailleurId
  );

  if (!bien) {
    throw new AppError(
      "vous ne pouvez pas créer une annonce pour ce bien",
      403
    );
  }

  /**
   * Un même bien ne peut pas avoir plus de deux annonces.
   */
  const nombreAnnonces = await annonceRepository.countByBienAndBailleur(
    bienId,
    bailleurId
  );

  if (nombreAnnonces >= 2) {
    throw new AppError(
      "ce bien possède déjà le nombre maximum d'annonces autorisé",
      409
    );
  }

  /**
   * Nettoyage des données avant création.
   */
  const donneesNettoyees = formaterObjet(data);

  const annonce = new Annonce({
    ...donneesNettoyees,

    idPublic: createId(),

    bailleurId,

    verifie: false,

    metaData: createMetaDataAnnonce({
      ...donneesNettoyees,
      bien,
      bailleurId,
    }),
  });

  return annonceRepository.create(annonce);
};

/**
 * Récupère la liste des annonces accessibles à l'utilisateur.
 *
 * La pagination est normalisée sous la forme :
 *
 * {
 *   annonces,
 *   pagination: {
 *     page,
 *     limit,
 *     totalItems,
 *     totalPages,
 *     hasNextPage,
 *     hasPreviousPage
 *   }
 * }
 *
 * @param {Object} params
 * @param {Object} params.filters Filtres et paramètres de pagination.
 * @param {Object} params.user Utilisateur authentifié.
 * @param {string} params.role Rôle de l'utilisateur.
 * @returns {Promise<Object>} Liste paginée des annonces.
 */
exports.getAnnonces = async ({ filters, user, role }) => {
  const { page, limit, ...criteres } = filters;

  /**
   * Construction du périmètre de recherche.
   *
   * Un bailleur consulte ses propres annonces.
   * Un locataire peut consulter les annonces publiées.
   * Un visiteur peut consulter les annonces publiques.
   */
  let criteresFinaux = {
    ...criteres,
  };

  if (role === "bailleur") {
    criteresFinaux.bailleurId = user.idPublic;
  }

  /**
   * Récupération des annonces et du nombre total en parallèle.
   */
  const [docs, totalItems] = await Promise.all([
    annonceRepository.findMany({
      criteres: criteresFinaux,
      page,
      limit,
      role,
      user,
    }),

    annonceRepository.countMany({
      criteres: criteresFinaux,
      role,
      user,
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    annonces: docs,

    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Récupère une annonce par son identifiant public.
 *
 * @param {Object} params
 * @param {string} params.id Identifiant public de l'annonce.
 * @param {Object} params.user Utilisateur authentifié.
 * @param {string} params.role Rôle de l'utilisateur.
 * @returns {Promise<Object>} Annonce complète.
 */
exports.getAnnonce = async ({ id, user, role }) => {
  const annonce = await annonceRepository.findByIdPublic(id);

  if (!annonce) {
    throw new AppError("annonce introuvable", 404);
  }

  /**
   * Un bailleur ne peut consulter que ses propres annonces
   * lorsqu'il consulte son espace de gestion.
   */
  if (role === "bailleur" && annonce.bailleurId !== user.idPublic) {
    throw new AppError("annonce introuvable", 404);
  }

  /**
   * Le repository/service récupère les relations nécessaires :
   * - bien ;
   * - bailleur ;
   * - favori éventuel pour un locataire.
   */
  const bien = await annonceRepository.findBienById(annonce.bienId);

  if (!bien) {
    throw new AppError("bien associé à l'annonce introuvable", 404);
  }

  let bailleur = null;
  let favoris = false;

  if (role !== "bailleur") {
    bailleur = await annonceRepository.findBailleurByPublicId(
      annonce.bailleurId
    );
  }

  if (role === "locataire") {
    favoris = await annonceRepository.existsFavori({
      annonceId: annonce.idPublic,
      locataireId: user.idPublic,
    });
  }

  return {
    ...annonce,
    bien,
    bailleur,
    favoris,
  };
};

/**
 * Met à jour une annonce appartenant au bailleur connecté.
 *
 * Les champs sensibles ne peuvent pas être modifiés par le client :
 * - bailleurId ;
 * - bienId ;
 * - idPublic.
 *
 * @param {Object} params
 * @param {string} params.id Identifiant public de l'annonce.
 * @param {Object} params.data Données à modifier.
 * @param {Object} params.user Utilisateur authentifié.
 * @param {string} params.role Rôle de l'utilisateur.
 * @returns {Promise<Object>} Annonce mise à jour.
 */
exports.updateAnnonce = async ({ id, data, user, role }) => {
  if (role !== "bailleur") {
    throw new AppError("accès refusé", 403);
  }

  const annonce = await annonceRepository.findByIdPublic(id);

  if (!annonce) {
    throw new AppError("annonce introuvable", 404);
  }

  if (annonce.bailleurId !== user.idPublic) {
    throw new AppError("annonce introuvable", 404);
  }

  /**
   * On interdit au client de modifier les relations
   * et l'identifiant de l'annonce.
   */
  const donnees = { ...data };

  delete donnees.bailleurId;
  delete donnees.bienId;
  delete donnees.idPublic;

  const donneesNettoyees = formaterObjet(donnees);

  return annonceRepository.update(id, donneesNettoyees);
};

/**
 * Supprime une annonce et les données qui lui sont associées.
 *
 * Les favoris et candidatures associés à l'annonce sont supprimés
 * afin d'éviter de conserver des références orphelines.
 *
 * @param {Object} params
 * @param {string} params.id Identifiant public de l'annonce.
 * @param {Object} params.user Utilisateur authentifié.
 * @param {string} params.role Rôle de l'utilisateur.
 * @returns {Promise<void>}
 */
exports.deleteAnnonce = async ({ id, user, role }) => {
  if (role !== "bailleur") {
    throw new AppError("accès refusé", 403);
  }

  const annonce = await annonceRepository.findByIdPublic(id);

  if (!annonce || annonce.bailleurId !== user.idPublic) {
    throw new AppError("annonce introuvable", 404);
  }

  await annonceRepository.remove(id);
};