/**
 * Model de l'authentification.
 *
 * Ce model est responsable de :
 * - construire les données utilisateur ;
 * - normaliser les données avant leur persistance ;
 * - définir les valeurs par défaut ;
 * - préparer les données retournées par Firestore.
 *
 */

/**
 * Crée la structure d'un utilisateur.
 *
 * @param {Object} data
 * @param {"bailleur"|"locataire"} data.role
 * @param {string} data.nom
 * @param {string} data.prenom
 * @param {string|null} [data.email]
 * @param {string|null} [data.telephone]
 * @param {string|null} [data.password]
 * @param {Boolean} [data.emailVerifie]
 * @param {Boolean} [data.telephoneVerifie]
 * @param {string|null} [data.uidGoogle]
 * @returns {Object}
 */
const createUser = ({
    role,
    nom,
    prenom,
    email = null,
    telephone = null,
    emailVerifie = false,
    telephoneVerifie = false,
    password = null,
    uidGoogle = null,
}) => {
    return {
        role,

        nom: nom?.trim() || null,
        prenom: prenom?.trim() || null,

        email: email
            ? email.trim().toLowerCase()
            : null,

        telephone: telephone || null,

        password,
        uidGoogle,

        emailVerifie,
        telephoneVerifie,

        profil: {
            complet: false,
        },
    };
};

/**
 * Calcule si le profil utilisateur est suffisamment renseigné.
 *
 * @param {Object} user
 * @param {string|null} user.nom
 * @param {string|null} user.prenom
 * @param {string|null} user.email
 * @param {string|null} user.telephone
 * @returns {boolean}
 */
const isProfileComplete = (user) => {
    return Boolean(
        user.nom &&
        user.prenom &&
        (user.email || user.telephone)
    );
};

/**
 * Met à jour l'état de complétude du profil.
 *
 * @param {Object} user
 * @returns {Object}
 */
const updateProfileCompletion = (user) => {
    return {
        ...user,
        profil: {
            ...user.profil,
            complet: isProfileComplete(user),
        },
    };
};

/**
 * Prépare un utilisateur avant sa persistance.
 *
 * Cette fonction permet de garantir que les valeurs
 * essentielles disposent d'une structure cohérente.
 *
 * @param {Object} user
 * @returns {Object}
 */
const serialize = (user) => {
    const normalizedUser = {
        ...user,

        nom: user.nom?.trim() || null,
        prenom: user.prenom?.trim() || null,

        email: user.email
            ? user.email.trim().toLowerCase()
            : null,

        telephone: user.telephone || null,
    };

    return updateProfileCompletion(normalizedUser);
};

/**
 * Prépare les données utilisateur retournées par Firestore.
 *
 * Les informations sensibles comme le mot de passe et le token
 * OAuth ne doivent pas être exposées au controller.
 *
 * @param {Object} user
 * @returns {Object}
 */
const toPublic = (user) => {
    if (!user) {
        return null;
    }

    const {
        password,
        idToken,
        ...publicUser
    } = user;

    return publicUser;
};

/**
 * Prépare les données utilisateur destinées au client
 * après une authentification.
 *
 * @param {Object} user
 * @param {Object|null} session
 * @returns {Object}
 */
const toAuthResponse = (user, session = null) => {
    return {
        user: toPublic(user),
        session,
    };
};

module.exports = {
    createUser,
    isProfileComplete,
    updateProfileCompletion,
    serialize,
    toPublic,
    toAuthResponse,
};
