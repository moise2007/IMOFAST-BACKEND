const { createId } = require("@paralleldrive/cuid2");
const { admin } = require("../../config/firebase");

const { Commentaire } = require("../../models/commentaire");
const commentaireRepository = require("../../repositories/commentaire.repository");

const Timestamp = admin.firestore.Timestamp;

/**
 * Types de cibles supportés par les commentaires.
 */
const TYPES_CIBLE = [
  "profil",
  "locataire",
  "annonce",
  "bien",
  "bailleur",
];

/**
 * Vérifie qu'un type de cible est supporté.
 *
 * @param {string} typeCible
 * @returns {boolean}
 */
const isValidTypeCible = (typeCible) => {
  return TYPES_CIBLE.includes(typeCible);
};

/**
 * Crée un commentaire.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @param {string} params.data.cibleId
 * @param {string} params.data.typeCible
 * @param {string} params.data.message
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const createCommentaire = async ({
  data,
  user,
  role,
}) => {
  const {
    cibleId,
    typeCible,
    message,
  } = data;

  if (!isValidTypeCible(typeCible)) {
    const error = new Error("Type de cible invalide.");
    error.statusCode = 409;
    throw error;
  }

  const cible = await commentaireRepository.findTargetByPublicId(
    typeCible,
    cibleId
  );

  if (!cible) {
    const error = new Error("La cible du commentaire est introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const idPublic = createId();

  const commentaire = new Commentaire({
    auteurId: user.idPublic,
    role,
    cibleId,
    idPublic,
    typeCible,
    message,

    // Données dénormalisées pour l'affichage.
    nom: user.nom,
    prenom: user.prenom,
    photoProfil: user.photoProfil,
  });

  const commentaireSnapshot = await commentaireRepository.create(
    commentaire.toFirebase()
  );

  if (typeCible === "annonce") {
    await commentaireRepository.incrementAnnonceCommentaires(
      cibleId
    );
  }

  return commentaireSnapshot.data();
};

/**
 * Récupère les commentaires d'une cible.
 *
 * @param {Object} params
 * @param {string} params.typeCible
 * @param {string} params.cibleId
 * @param {number} params.pageSize
 * @param {string} [params.lastId]
 * @returns {Promise<Object>}
 */
const getCommentaires = async ({
  typeCible,
  cibleId,
  pageSize,
  lastId,
}) => {
  if (!isValidTypeCible(typeCible)) {
    const error = new Error("Type de cible invalide.");
    error.statusCode = 400;
    throw error;
  }

  const cible = await commentaireRepository.findTargetByPublicId(
    typeCible,
    cibleId
  );

  if (!cible) {
    const error = new Error("La cible est introuvable.");
    error.statusCode = 404;
    throw error;
  }

  return commentaireRepository.findByTarget({
    typeCible,
    cibleId,
    pageSize,
    lastId,
  });
};

/**
 * Modifie un commentaire appartenant à l'utilisateur connecté.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.message
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const updateCommentaire = async ({
  idPublic,
  message,
  user,
  role,
}) => {
  const commentaire =
    await commentaireRepository.findByPublicIdAndAuthor({
      idPublic,
      auteurId: user.idPublic,
      role,
    });

  if (!commentaire) {
    const error = new Error("Commentaire introuvable.");
    error.statusCode = 404;
    throw error;
  }

  return commentaireRepository.updateByDocumentId(
    commentaire.id,
    {
      message,
      updatedAt: Timestamp.now(),
    }
  ).then((snapshot) => snapshot.data());
};

/**
 * Supprime un commentaire appartenant à l'utilisateur connecté.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<void>}
 */
const deleteCommentaire = async ({
  idPublic,
  user,
  role,
}) => {
  const commentaire =
    await commentaireRepository.findByPublicIdAndAuthor({
      idPublic,
      auteurId: user.idPublic,
      role,
    });

  if (!commentaire) {
    const error = new Error("Commentaire introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const data = commentaire.data();

  await commentaireRepository.deleteByDocumentId(
    commentaire.id
  );

  if (data.typeCible === "annonce") {
    await commentaireRepository.decrementAnnonceCommentaires(
      data.cibleId
    );
  }
};

/**
 * Ajoute une réponse à un commentaire.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.message
 * @param {Object} params.user
 * @param {string} params.role
 * @returns {Promise<{
 *   commentaire: Object,
 *   reponse: Object
 * }>}
 */
const respondToCommentaire = async ({
  idPublic,
  message,
  user,
  role,
}) => {
  const commentaire =
    await commentaireRepository.findByPublicId(idPublic);

  if (!commentaire) {
    const error = new Error("Commentaire introuvable.");
    error.statusCode = 404;
    throw error;
  }

  const reponse = {
    idPublic: createId(),
    auteurId: user.idPublic,
    role,
    message,
    nom: user.nom ?? null,
    prenom: user.prenom ?? null,
    photoProfil: user.photoProfil ?? null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const data = commentaire.data();

  const commentaireUpdated =
    await commentaireRepository.addResponse(
      commentaire.id,
      reponse,
      data.reponses ?? []
    );

  return {
    commentaire: commentaireUpdated.data(),
    reponse,
  };
};

module.exports = {
  createCommentaire,
  getCommentaires,
  updateCommentaire,
  deleteCommentaire,
  respondToCommentaire,
};