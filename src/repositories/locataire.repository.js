const { admin } = require("../config/firebase");

const db = admin.firestore();
const { FieldValue } = admin.firestore;

/**
 * Retourne la collection Firestore des locataires.
 *
 * @returns {FirebaseFirestore.CollectionReference}
 */
const getCollection = () => {
    return db.collection("locataires");
};

/**
 * Recherche un locataire par son identifiant Firestore.
 *
 * @async
 * @param {string} locataireId
 * @returns {Promise<Object|null>}
 */
const findById = async (locataireId) => {
    const document = await getCollection()
        .doc(locataireId)
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
 * Recherche un locataire par son identifiant public.
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
 * Recherche un locataire par son email.
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
 * Recherche un locataire par son numéro de téléphone.
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
 * Met à jour les données d'un locataire.
 *
 * @async
 * @param {string} locataireId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
const update = async (locataireId, data) => {
    const updateData = {
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
    };

    await getCollection()
        .doc(locataireId)
        .update(updateData);

    return findById(locataireId);
};

/**
 * Supprime définitivement un locataire.
 *
 * @async
 * @param {string} locataireId
 * @returns {Promise<void>}
 */
const remove = async (locataireId) => {
    await getCollection()
        .doc(locataireId)
        .delete();
};

/**
 * Supprime toutes les sessions d'un locataire.
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