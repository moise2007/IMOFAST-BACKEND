const { db, admin } = require("../config/firebase");

const { Filter } = admin.firestore;

const COMMENTAIRE_COLLECTION = "commentaire";

/**
 * Crée un commentaire dans Firestore.
 *
 * @param {Object} data
 * @returns {Promise<import("firebase-admin").firestore.DocumentSnapshot>}
 */
const create = async (data) => {
  const documentReference = await db
    .collection(COMMENTAIRE_COLLECTION)
    .add(data);

  return documentReference.get();
};

/**
 * Recherche un commentaire par son identifiant public.
 *
 * @param {string} idPublic
 * @returns {Promise<import("firebase-admin").firestore.DocumentSnapshot|null>}
 */
const findByPublicId = async (idPublic) => {
  const snapshot = await db
    .collection(COMMENTAIRE_COLLECTION)
    .where("idPublic", "==", idPublic)
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0];
};

/**
 * Recherche un commentaire appartenant à un auteur.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.auteurId
 * @param {string} params.role
 * @returns {Promise<import("firebase-admin").firestore.DocumentSnapshot|null>}
 */
const findByPublicIdAndAuthor = async ({
  idPublic,
  auteurId,
  role,
}) => {
  const snapshot = await db
    .collection(COMMENTAIRE_COLLECTION)
    .where(
      Filter.and(
        Filter.where("idPublic", "==", idPublic),
        Filter.where("auteurId", "==", auteurId),
        Filter.where("role", "==", role)
      )
    )
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0];
};

/**
 * Recherche les commentaires associés à une cible.
 *
 * @param {Object} params
 * @param {string} params.typeCible
 * @param {string} params.cibleId
 * @param {number} params.pageSize
 * @param {string} [params.lastId]
 * @returns {Promise<{
 *   commentaires: Object[],
 *   total: number,
 *   hasMore: boolean
 * }>}
 */
const findByTarget = async ({
  typeCible,
  cibleId,
  pageSize,
  lastId,
}) => {
  const baseQuery = db
    .collection(COMMENTAIRE_COLLECTION)
    .where("typeCible", "==", typeCible)
    .where("cibleId", "==", cibleId);

  const totalSnapshot = await baseQuery.count().get();
  const total = totalSnapshot.data().count;

  let query = baseQuery.orderBy("createdAt", "desc");

  if (lastId && lastId !== "null") {
    const lastCommentaire = await findByPublicId(lastId);

    if (lastCommentaire) {
      query = query.startAfter(lastCommentaire);
    }
  }

  const snapshot = await query.limit(pageSize).get();

  const commentaires = snapshot.docs.map((doc) => doc.data());

  return {
    commentaires,
    total,
    hasMore: commentaires.length === pageSize,
  };
};

/**
 * Met à jour un commentaire.
 *
 * @param {string} documentId
 * @param {Object} data
 * @returns {Promise<import("firebase-admin").firestore.DocumentSnapshot>}
 */
const updateByDocumentId = async (documentId, data) => {
  const documentReference = db
    .collection(COMMENTAIRE_COLLECTION)
    .doc(documentId);

  await documentReference.update(data);

  return documentReference.get();
};

/**
 * Supprime un commentaire.
 *
 * @param {string} documentId
 * @returns {Promise<void>}
 */
const deleteByDocumentId = async (documentId) => {
  await db
    .collection(COMMENTAIRE_COLLECTION)
    .doc(documentId)
    .delete();
};

/**
 * Ajoute une réponse à un commentaire.
 *
 * @param {string} documentId
 * @param {Object} response
 * @param {Object[]} responses
 * @returns {Promise<import("firebase-admin").firestore.DocumentSnapshot>}
 */
const addResponse = async (
  documentId,
  response,
  responses
) => {
  const documentReference = db
    .collection(COMMENTAIRE_COLLECTION)
    .doc(documentId);

  await documentReference.update({
    reponses: [...responses, response],
    updatedAt: admin.firestore.Timestamp.now(),
  });

  return documentReference.get();
};

/**
 * Recherche une cible par son identifiant public.
 *
 * @param {string} collection
 * @param {string} idPublic
 * @returns {Promise<import("firebase-admin").firestore.DocumentSnapshot|null>}
 */
const findTargetByPublicId = async (collection, idPublic) => {
  const snapshot = await db
    .collection(collection)
    .where("idPublic", "==", idPublic)
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0];
};

/**
 * Incrémente le nombre de commentaires d'une annonce.
 *
 * @param {string} cibleId
 * @returns {Promise<void>}
 */
const incrementAnnonceCommentaires = async (cibleId) => {
  const annonce = await findTargetByPublicId("annonce", cibleId);

  if (!annonce) {
    return;
  }

  await annonce.ref.update({
    "statistiques.commentaires":
      admin.firestore.FieldValue.increment(1),
  });
};

/**
 * Décrémente le nombre de commentaires d'une annonce.
 *
 * @param {string} cibleId
 * @returns {Promise<void>}
 */
const decrementAnnonceCommentaires = async (cibleId) => {
  const annonce = await findTargetByPublicId("annonce", cibleId);

  if (!annonce) {
    return;
  }

  const statistiques = annonce.data()?.statistiques ?? {};
  const commentaires = Math.max(
    0,
    Number(statistiques.commentaires ?? 0) - 1
  );

  await annonce.ref.update({
    "statistiques.commentaires": commentaires,
  });
};

module.exports = {
  create,
  findByPublicId,
  findByPublicIdAndAuthor,
  findByTarget,
  updateByDocumentId,
  deleteByDocumentId,
  addResponse,
  findTargetByPublicId,
  incrementAnnonceCommentaires,
  decrementAnnonceCommentaires,
};