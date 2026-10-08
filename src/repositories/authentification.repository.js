const{ admin } = require("../config/firebase");
const { verifyGoogleTokenAuth } = require("../services/verifyIdGoogle.service");

const db = admin.firestore();
const { FieldValue, Filter } = admin.firestore;

/**
 * Collections utilisateurs disponibles dans l'application.
 *
 * @type {Object.<string, string>}
 */
const COLLECTIONS = {
    bailleur: "bailleur",
    locataire: "locataire",
};

/**
 * Retourne la collection Firestore correspondant au rôle.
 *
 * @param {"bailleur"|"locataire"} role
 * @returns {FirebaseFirestore.CollectionReference}
 */
const getCollection = (role) => {
    const collectionName = COLLECTIONS[role];

    if (!collectionName) {
        throw new Error("Rôle utilisateur invalide.");
    }

    return db.collection(collectionName);
};

/**
 * Recherche un utilisateur à partir de son identifiant.
 *
 * L'identifiant peut être une adresse email ou un numéro
 * de téléphone.
 *
 * @param {Object} params
 * @param {"bailleur"|"locataire"} params.role
 * @param {string} params.identifiant
 * @returns {Promise<Object|null>}
 */
const findUserByIdentifier = async ({
    role,
    identifiant,
}) => {
    const collection = getCollection(role);

    const snapshot = await collection
        .where(
            Filter.or(
                Filter.where("email", "==", identifiant),
                Filter.where("telephone", "==", identifiant)
            )
        )
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
 * Recherche un utilisateur par son identifiant Firestore.
 *
 * @param {Object} params
 * @param {"bailleur"|"locataire"} params.role
 * @param {string} params.userId
 * @returns {Promise<Object|null>}
 */
const findUserById = async ({
    role,
    userId,
}) => {
    const collection = getCollection(role);

    const document = await collection
        .doc(userId)
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
 * Recherche un utilisateur vérifié possédant l'un des identifiants.
 *
 * @param {Object} params
 * @param {"bailleur"|"locataire"} params.role
 * @param {string|null} params.email
 * @param {string|null} params.telephone
 * @param {string} [params.excludeUserId]
 * @returns {Promise<Object|null>}
 */
const findVerifiedUserByIdentifier = async ({
    role,
    email = null,
    telephone = null,
    excludeUserId = null,
}) => {
    const collection = getCollection(role);

    const filters = [];

    if (email) {
        filters.push(
            Filter.where(
                "email",
                "==",
                email
            )
        );
    }

    if (telephone) {
        filters.push(
            Filter.where(
                "telephone",
                "==",
                telephone
            )
        );
    }

    if (filters.length === 0) {
        return null;
    }

    const identifierFilter =
        filters.length === 1
            ? filters[0]
            : Filter.or(...filters);

    const snapshot = await collection
        .where(
            Filter.and(
                identifierFilter,
                Filter.where(
                    "verification.emailVerifie",
                    "==",
                    true
                )
            )
        )
        .limit(10)
        .get();

    const document = snapshot.docs.find(
        (doc) => doc.id !== excludeUserId
    );

    if (!document) {
        return null;
    }

    return {
        id: document.id,
        ...document.data(),
    };
};

/**
 * Supprime les comptes non vérifiés utilisant les mêmes identifiants.
 *
 * @param {Object} params
 * @param {"bailleur"|"locataire"} params.role
 * @param {string|null} params.email
 * @param {string|null} params.telephone
 * @returns {Promise<void>}
 */
const deleteUnverifiedDuplicates = async ({
    role,
    email = null,
    telephone = null,
}) => {
    const collection = getCollection(role);

    const filters = [];

    if (email) {
        filters.push(
            Filter.where(
                "email",
                "==",
                email
            )
        );
    }

    if (telephone) {
        filters.push(
            Filter.where(
                "telephone",
                "==",
                telephone
            )
        );
    }

    if (filters.length === 0) {
        return;
    }

    const identifierFilter =
        filters.length === 1
            ? filters[0]
            : Filter.or(...filters);

    const snapshot = await collection
        .where(
            Filter.and(
                identifierFilter,
                Filter.where(
                    "verification.emailVerifie",
                    "==",
                    false
                )
            )
        )
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

/**
 * Crée un utilisateur dans Firestore.
 *
 * @param {"bailleur"|"locataire"} role
 * @param {Object} data
 * @returns {Promise<Object>}
 */
const createUser = async (role, data) => {
    const collection = getCollection(role);
    const userData = {...data};
    const document = collection.doc();
    await document.set(userData);
    const createdDocument = await document.get();

    return {
        id: createdDocument.id,
        ...createdDocument.data(),
    };
};

/**
 * Met à jour l'identifiant d'un utilisateur.
 *
 * @param {Object} params
 * @param {"bailleur"|"locataire"} params.role
 * @param {string} params.userId
 * @param {string|null} params.email
 * @param {string|null} params.telephone
 * @param {string} [params.lastEmail]
 * @param {string} [params.lastTelephone]
 * @returns {Promise<Object>}
 */
const updateIdentifier = async ({
    role,
    userId,
    email = null,
    telephone = null,
    lastEmail = null,
    lastTelephone = null,
}) => {
    const collection = getCollection(role);
    const reference = collection.doc(userId);

    const updateData = {
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (email) {
        updateData.email = email;
        updateData["verification.emailVerifie"] = false;
    }

    if (telephone) {
        updateData.telephone = telephone;
        updateData["verification.telephoneVerifie"] = false;
    }

    if (lastEmail) {
        updateData.lastEmail = lastEmail;
    }

    if (lastTelephone) {
        updateData.lastTelephone = lastTelephone;
    }

    await reference.update(updateData);

    const document = await reference.get();

    return {
        id: document.id,
        ...document.data(),
    };
};

/**
 * Met à jour le mot de passe d'un utilisateur.
 *
 * @param {Object} params
 * @param {"bailleur"|"locataire"} params.role
 * @param {string} params.userId
 * @param {string} params.password
 * @returns {Promise<void>}
 */
const updatePassword = async ({
    role,
    userId,
    password,
}) => {
    const collection = getCollection(role);

    await collection
        .doc(userId)
        .update({
            password,
            updatedAt: FieldValue.serverTimestamp(),
        });
};


/**
 * Marque l'adresse email comme vérifiée.
 *
 * @param {"bailleur"|"locataire"} role
 * @param {string} userId
 * @returns {Promise<void>}
 */
const markEmailAsVerified = async (
    role,
    userId
) => {
    const collection = getCollection(role);

    await collection
        .doc(userId)
        .update({
            "verification.emailVerifie": true,
            updatedAt: FieldValue.serverTimestamp(),
        });
};

/**
 * Marque le numéro de téléphone comme vérifié.
 *
 * @param {"bailleur"|"locataire"} role
 * @param {string} userId
 * @returns {Promise<void>}
 */
const markTelephoneAsVerified = async (
    role,
    userId
) => {
    const collection = getCollection(role);

    await collection
        .doc(userId)
        .update({
            "verification.telephoneVerifie": true,
            updatedAt: FieldValue.serverTimestamp(),
        });
};

/**
 * Supprime une session utilisateur.
 *
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
const deleteSession = async (sessionId) => {
    if (!sessionId) {
        return;
    }

    await db
        .collection("sessions")
        .doc(sessionId)
        .delete();
};

/**
 * Crée un token temporaire de récupération du mot de passe.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {"bailleur"|"locataire"} params.role
 * @param {string} params.identifiant
 * @returns {Promise<Object>}
 */
const createPasswordResetToken = async ({
    userId,
    role,
    identifiant,
}) => {
    const reference = db
        .collection("passwordResetTokens")
        .doc();

    const expiresAt = new Date(
        Date.now() + 10 * 60 * 1000
    );

    const data = {
        userId,
        role,
        identifiant,
        expiresAt,
        used: false,
        createdAt: FieldValue.serverTimestamp(),
    };

    await reference.set(data);

    return {
        id: reference.id,
        ...data,
    };
};

/**
 *
 * verifie le token de réinitialisation de mot de passe
 * @param {Object} params
 * @param {"bailleur"|"locataire"} params.role
 * @param {string} params.identifiant
 * @returns {Promise<Object>}
 */
const verifiedPasswordResetToken = async ({
    role,
    identifiant,
}) => {
    const collection = db
        .collection("passwordResetTokens")

    
    const tokenSnapshot = await collection.where("identifiant","==",identifiant).limit(1).get()
    if(tokenSnapshot.empty){
        return null
    }

    const token ={...tokenSnapshot.docs[0].data()}

    if(new Date(token.expiresAt) < new Date() || token.used || token.role != role){
        return null
    }
    return true
    
};

/**
 * Vérifie un token Firebase utilisé pour l'authentification Google.
 *
 * @param {string} idToken
 * @returns {Promise<Object>} 
 */
const verifyGoogleToken = async (idToken) => {
    const decodedToken = await verifyGoogleTokenAuth(idToken)

    if(!decodedToken.success){
        return ;
    }
    return decodedToken.user
};

/**
 * Vérifie un token Firebase provenant d'une authentification
 * par téléphone.
 *
 * @param {string} idToken
 * @returns {Promise<Object>}
 */
const verifyTelephoneToken = async (idToken) => {
    return admin
        .auth()
        .verifyIdToken(idToken);
};

module.exports = {
    findUserByIdentifier,
    findUserById,
    findVerifiedUserByIdentifier,
    deleteUnverifiedDuplicates,
    createUser,
    updateIdentifier,
    updatePassword,
    markEmailAsVerified,
    markTelephoneAsVerified,
    deleteSession,
    createPasswordResetToken,
    verifyGoogleToken,
    verifyTelephoneToken,
    verifiedPasswordResetToken,
};
