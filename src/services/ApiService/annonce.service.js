const { annoncePresentation } = require("../../utils/annoncePresentation");
const publicOwner = owner => owner ? Object.fromEntries(
  ['idPublic', 'nom', 'prenom', 'nomAgence', 'photoProfil', 'avatar', 'photo', 'type', 'note', 'notes', 'verification', 'createdAt']
    .filter(key => owner[key] !== undefined).map(key => [key, owner[key]])
) : null;
const { createId } = require("@paralleldrive/cuid2");

const AppError = require("../../errors/AppError");
const annonceRepository = require("../../repositories/annonce.repository");

const { formaterObjet } = require("../../utils/formaterObjet");
const { createMetaDataAnnonce } = require("../../utils/createMetaDataAnnonce");
const { Annonce } = require("../../models/annonce");
const { getBiens, getBien } = require("./bien.service");
const { findByPublicId } = require("../../repositories/bailleur.repository");
const { notifyTenantsForListing } = require("../../notifications/alertDelivery");

const withViewStats = (annonce) => {
  const vues = {
    simple: annonce.vues?.simple ?? 0,
    profonde: annonce.vues?.profonde ?? 0,
  };

  return {
    ...annonce,
    vues,
    statistiques: {
      ...annonce.statistiques,
      vues: Math.max(
        Number(annonce.statistiques?.vues) || 0,
        Number(vues.profonde) || 0,
      ),
    },
  };
};

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
    throw new AppError("errors:backend.forbidden", 403);
  }
  console.log(data)

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
    throw new AppError( "errors:backend.forbidden", 403);
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
      "errors:backend.forbidden",
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
  }).toFirebase();

  const created = await annonceRepository.create(annonce);
  // The publication job delivers the durable notification flag, including after a restart.
  return created;
};

/**
 * Récupère les annonces accessibles à l'utilisateur
 * et enrichit chaque annonce avec son bien et son bailleur.
 *
 * @param {Object} params
 * @param {Object} params.filters Filtres et pagination.
 * @param {Object} params.user Utilisateur authentifié.
 * @param {string} params.role Rôle de l'utilisateur.
 *
 * @returns {Promise<Object>} Liste paginée des annonces enrichies.
 */
exports.getAnnonces = async ({ filters, user, role }) => {
  const { page, limit, ...criteres } = filters;

  const criteresFinaux = { ...criteres };
  if (criteresFinaux.nature === "meuble") criteresFinaux.nature = "meubler";
  if (criteresFinaux.status) criteresFinaux.status = require("../../utils/publication").normalizeStatus(criteresFinaux.status);

  if (role === "bailleur") {
    criteresFinaux.bailleurId = user.idPublic;
  }

  /**
   * Récupération des annonces et du nombre total en parallèle.
   */
  if (role !== "bailleur" && role !== "admin") criteresFinaux.status = "publier";
  const { annonces, totalItems } = await annonceRepository.findPage({ criteres: criteresFinaux, page, limit });

  /**
   * Enrichissement des annonces.
   */

  const favoris = role === "locataire" ? await annonceRepository.favorisForAnnonces(annonces.map(a => a.idPublic), user.idPublic) : new Map();
  let annoncesEnrichies = [...(annonces ?? [])]
  annoncesEnrichies = await Promise.all(
    annonces.map(async (annonce) => {
      const [bien, bailleur] = await Promise.all([
        getBien({id: annonce.bienId}),
        role == "bailleur" ? user :  findByPublicId(annonce.bailleurId),
      ]);

      return {
        ...withViewStats(annonce),
        bien,
        bailleur: role === 'bailleur' || role === 'admin' ? bailleur ?? null : publicOwner(bailleur),
        favoris: favoris.get(annonce.idPublic) ?? false,
      };
    })
  );



  /**
   * Pagination.
   */
  const totalPages = Math.ceil(totalItems / limit);

  return {
    annonces: annoncesEnrichies,

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
    throw new AppError("errors:backend.notFound", 404);
  }

  /**
   * Un bailleur ne peut consulter que ses propres annonces
   * lorsqu'il consulte son espace de gestion.
   */
  if (role === "bailleur" && annonce.bailleurId !== user.idPublic) {
    throw new AppError("errors:backend.notFound", 404);
  }

  /**
   * Le repository/service récupère les relations nécessaires :
   * - bien ;
   * - bailleur ;
   * - favori éventuel pour un locataire.
   */
  if (!['bailleur', 'admin'].includes(role) && (annonce.status !== 'publier' || annonce.estPubliee === false || (annonce.dateExpiration && +new Date(annonce.dateExpiration) <= Date.now())))
    throw new AppError('errors:backend.notFound', 404);
  const bien = await annonceRepository.findBienById(annonce.bienId);

  if (!bien) {
    throw new AppError("errors:backend.notFound", 404);
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
    ...withViewStats(annonce),
    presentation: annoncePresentation(annonce, bailleur),
    bien,
    bailleur: role === 'admin' ? bailleur : { ...publicOwner(bailleur), ...(role === 'locataire' && bailleur?.telephone ? { telephone: bailleur.telephone } : {}) },
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
    throw new AppError("errors:backend.forbidden", 403);
  }

  const annonce = await annonceRepository.findByIdPublic(id);

  if (!annonce) {
    throw new AppError("errors:backend.notFound", 404);
  }

  if (annonce.bailleurId !== user.idPublic) {
    throw new AppError("errors:backend.notFound", 404);
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

  const publication = require('../../utils/publication').publicationFields(donnees, annonce);
  const updated = await annonceRepository.update(id, { ...donneesNettoyees, ...publication,
    ...(publication.status === 'publier' && annonce.status !== 'publier' ? { publicationNotificationPending: true } : {}) });
  if (updated.status !== 'publier') require('./selection-annonce.service').removeFromSelections(id);
  return updated;
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
    throw new AppError("errors:backend.forbidden", 403);
  }

  const annonce = await annonceRepository.findByIdPublic(id);

  if (!annonce || annonce.bailleurId !== user.idPublic) {
    throw new AppError("errors:backend.notFound", 404);
  }

  await annonceRepository.remove(id);
  require("./selection-annonce.service").removeFromSelections(id);
};
