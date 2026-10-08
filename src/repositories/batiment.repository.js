const { db, admin } = require("../config/firebase");

const { Filter } = admin.firestore;
const Timestamp = admin.firestore.Timestamp;

const COLLECTION = "batiment";
const PAGE_SIZE = 30;

/**
 * Crée un bâtiment dans Firestore.
 *
 * @param {Object} data
 * @returns {Promise<Object>}
 */
const create = async (data) => {
  const document = await db.collection(COLLECTION).add(data);

  return {
    ...data,
    firestoreId: document.id,
  };
};

/**
 * Recherche un bâtiment par son identifiant public
 * et vérifie que l'utilisateur en est gestionnaire.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {string} params.userId
 * @param {string} params.role
 * @returns {Promise<Object|null>}
 */
const findById = async ({ id, userId, role }) => {
  let query = db
    .collection(COLLECTION)
    .where("idPublic", "==", id)
    .where("delete", "==", false);

  /**
   * Pour les utilisateurs classiques, on vérifie
   * qu'ils font partie des gestionnaires.
   */
  if (role !== "admin") {
    query = query.where(
      "gestionnaires",
      "array-contains",
      userId
    );
  }

  const snapshot = await query.limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  return {
    ...snapshot.docs[0].data(),
    firestoreId: snapshot.docs[0].id,
  };
};

/**
 * Récupère les bâtiments accessibles à un utilisateur.
 *
 * @param {Object} params
 * @param {Object} params.filters
 * @param {string} params.userId
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const findMany = async ({ filters, userId, role }) => {
  const {
    ville,
    quartier,
    nom,
    lastId,
  } = filters;

  let query = db
    .collection(COLLECTION)
    .where("delete", "==", false);

  if (role !== "admin") {
    query = query.where(
      "gestionnaires",
      "array-contains",
      userId
    );
  }

  if (ville) {
    query = query.where(
      "localisation.ville",
      "==",
      ville
    );
  }

  if (quartier) {
    query = query.where(
      "localisation.quartier",
      "==",
      quartier
    );
  }

  if (nom) {
    query = query
      .where("nom", ">=", nom)
      .where("nom", "<=", `${nom}\uf8ff`);
  } else {
    query = query.orderBy("createdAt", "desc");
  }

  query = query.limit(PAGE_SIZE);

  /**
   * Pagination Firestore par curseur.
   */
  if (lastId) {
    const lastDocument = await db
      .collection(COLLECTION)
      .doc(lastId)
      .get();

    if (lastDocument.exists) {
      query = query.startAfter(lastDocument);
    }
  }

  const snapshot = await query.get();

  const batiments = snapshot.docs.map((doc) => ({
    ...doc.data(),
    firestoreId: doc.id,
  }));

  const lastCursor =
    snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

  return {
    batiments,
    lastCursor,
    hasMore: snapshot.docs.length === PAGE_SIZE,
  };
};

/**
 * Met à jour un bâtiment.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {Object} params.data
 * @returns {Promise<Object>}
 */
const update = async ({ id, data }) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("idPublic", "==", id)
    .where("delete", "==", false)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  const updateData = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  await document.ref.update(updateData);

  return {
    ...document.data(),
    ...updateData,
    firestoreId: document.id,
  };
};

/**
 * Effectue une suppression logique d'un bâtiment.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
const softDelete = async (id) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("idPublic", "==", id)
    .where("delete", "==", false)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return;
  }

  await snapshot.docs[0].ref.update({
    delete: true,
    updatedAt: Timestamp.now(),
  });
};

module.exports = {
  create,
  findById,
  findMany,
  update,
  softDelete,
};