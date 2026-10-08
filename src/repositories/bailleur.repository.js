const { admin } = require("../config/firebase");

const db = admin.firestore();
const { FieldValue } = admin.firestore;

/**
 * Référence vers la collection des bailleurs.
 *
 * @returns {FirebaseFirestore.CollectionReference}
 */
const getCollection = () => {
    return db.collection("bailleurs");
};

/**
 * Récupère un bailleur par son identifiant Firestore.
 *
 * @async
 * @param {string} bailleurId
 * @returns {Promise<Object|null>}
 */
const findById = async (bailleurId) => {
    const document = await getCollection()
        .doc(bailleurId)
        .get();

    if (!document.exists) {
        return null;
    }

    return {
        id: document.id,
        ...document.data(),
    };
};

/**
 * Récupère un bailleur par son identifiant public.
 *
 * @async
 * @param {string} idPublic
 * @returns {Promise<Object|null>}
 */
const findByPublicId = async (idPublic) => {
    const snapshot = await getCollection()
        .where("idPublic", "==", idPublic)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const document = snapshot.docs[0];

    return {
        id: document.id,
        ...document.data(),
    };
};

/**
 * Récupère un bailleur par son email.
 *
 * @async
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
const findByEmail = async (email) => {
    const snapshot = await getCollection()
        .where("email", "==", email)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const document = snapshot.docs[0];

    return {
        id: document.id,
        ...document.data(),
    };
};

/**
 * Récupère un bailleur par son numéro de téléphone.
 *
 * @async
 * @param {string} telephone
 * @returns {Promise<Object|null>}
 */
const findByTelephone = async (telephone) => {
    const snapshot = await getCollection()
        .where("telephone", "==", telephone)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const document = snapshot.docs[0];

    return {
        id: document.id,
        ...document.data(),
    };
};

/**
 * Met à jour les données d'un bailleur.
 *
 * @async
 * @param {string} bailleurId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
const update = async (bailleurId, data) => {
    const updateData = {
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
    };

    await getCollection()
        .doc(bailleurId)
        .update(updateData);

    return findById(bailleurId);
};

/**
 * Supprime définitivement un bailleur.
 *
 * @async
 * @param {string} bailleurId
 * @returns {Promise<void>}
 */
const remove = async (bailleurId) => {
    await getCollection()
        .doc(bailleurId)
        .delete();
};

/**
 * Supprime toutes les sessions associées à un bailleur.
 *
 * @async
 * @param {string} userId
 * @returns {Promise<void>}
 */
const deleteSessions = async (userId) => {
    const snapshot = await db
        .collection("sessions")
        .where("userId", "==", userId)
        .get();

    if (snapshot.empty) {
        return;
    }

    const batch = db.batch();

    snapshot.docs.forEach((document) => {
        batch.delete(document.ref);
    });

    await batch.commit();
};

module.exports = {
    findById,
    findByPublicId,
    findByEmail,
    findByTelephone,
    update,
    remove,
    deleteSessions,
};