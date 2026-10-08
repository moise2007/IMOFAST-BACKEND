/**
 * Validators du domaine authentification.
 *
 * Responsabilités :
 * - Vérifier la présence des champs obligatoires.
 * - Vérifier le format des données.
 * - Retourner des erreurs de validation cohérentes.
 *
 * Ce fichier ne doit pas :
 * - accéder à Firestore ;
 * - appeler un service ;
 * - appeler un repository ;
 * - contenir de logique métier.
 */

/**
 * Rôles autorisés dans l'application.
 *
 * @type {string[]}
 */
const ROLES_AUTORISES = [
    "bailleur",
    "locataire",
];

/**
 * Vérifie qu'une valeur est une chaîne non vide.
 *
 * @param {*} value
 * @returns {boolean}
 */
const isNonEmptyString = (value) => {
    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
};

/**
 * Vérifie le format d'une adresse email.
 *
 * @param {*} email
 * @returns {boolean}
 */
const isValidEmail = (email) => {
    if (!isNonEmptyString(email)) {
        return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim()
    );
};

/**
 * Vérifie le format minimal d'un numéro de téléphone.
 *
 * La normalisation complète du numéro est réalisée
 * dans le service avec normalizeTelephone().
 *
 * @param {*} telephone
 * @returns {boolean}
 */
const isValidTelephone = (telephone) => {
    if (!isNonEmptyString(telephone)) {
        return false;
    }

    return /^[+0-9\s().-]{6,20}$/.test(
        telephone.trim()
    );
};

/**
 * Vérifie qu'un mot de passe respecte les règles minimales.
 *
 * @param {*} password
 * @returns {boolean}
 */
const isValidPassword = (password) => {
    return (
        typeof password === "string" &&
        password.length >= 8
    );
};

/**
 * Vérifie qu'un rôle est autorisé.
 *
 * @param {*} role
 * @returns {boolean}
 */
const isValidRole = (role) => {
    return ROLES_AUTORISES.includes(role);
};

/**
 * Vérifie qu'un identifiant est un email ou un téléphone.
 *
 * @param {*} identifiant
 * @returns {boolean}
 */
const isValidIdentifier = (identifiant) => {
    return (
        isValidEmail(identifiant) ||
        isValidTelephone(identifiant)
    );
};

/**
 * Vérifie qu'un code OTP est valide.
 *
 * Ici, nous attendons un code numérique de 6 chiffres.
 *
 * @param {*} code
 * @returns {boolean}
 */
const isValidOtp = (code) => {
    return /^\d{6}$/.test(
        String(code ?? "").trim()
    );
};

/**
 * Vérifie qu'un objet est valide.
 *
 * @param {*} value
 * @returns {boolean}
 */
const isObject = (value) => {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
};

/**
 * Schéma d'inscription.
 *
 * @param {Object} body
 * @returns {Object}
 * @throws {Error}
 */
const registerSchema = (body = {}) => {
    const {
        role,
        nom,
        prenom,
        email,
        telephone,
        password,
    } = body;

    if (!isValidRole(role)) {
        throw new Error(
            "Le rôle doit être 'bailleur' ou 'locataire'."
        );
    }

    if (!isNonEmptyString(nom)) {
        throw new Error(
            "Le nom est obligatoire."
        );
    }

    if (!isNonEmptyString(prenom)) {
        throw new Error(
            "Le prénom est obligatoire."
        );
    }

    if (!email && !telephone) {
        throw new Error(
            "Un email ou un numéro de téléphone est obligatoire."
        );
    }

    if (
        email !== undefined &&
        email !== null &&
        !isValidEmail(email)
    ) {
        throw new Error(
            "L'adresse email est invalide."
        );
    }

    if (
        telephone !== undefined &&
        telephone !== null &&
        !isValidTelephone(telephone)
    ) {
        throw new Error(
            "Le numéro de téléphone est invalide."
        );
    }

    if (
        password !== undefined &&
        password !== null &&
        !isValidPassword(password)
    ) {
        throw new Error(
            "Le mot de passe doit contenir au moins 8 caractères."
        );
    }

    return body;
};

/**
 * Schéma de connexion.
 *
 * @param {Object} body
 * @returns {Object}
 * @throws {Error}
 */
const loginSchema = (body = {}) => {
    const {
        role,
        identifiant,
        password,
    } = body;

    if (!isValidRole(role)) {
        throw new Error(
            "Le rôle doit être 'bailleur' ou 'locataire'."
        );
    }

    if (!isValidIdentifier(identifiant)) {
        throw new Error(
            "L'identifiant doit être un email ou un numéro de téléphone valide."
        );
    }

    if (!isNonEmptyString(password)) {
        throw new Error(
            "Le mot de passe est obligatoire."
        );
    }

    return body;
};

/**
 * Schéma d'authentification Google.
 *
 * @param {Object} body
 * @returns {Object}
 * @throws {Error}
 */
const googleAuthSchema = (body = {}) => {
    const {
        idToken,
        role,
    } = body;

    if (!isNonEmptyString(idToken)) {
        throw new Error(
            "Le token Google est obligatoire."
        );
    }

    if (!isValidRole(role)) {
        throw new Error(
            "Le rôle doit être 'bailleur' ou 'locataire'."
        );
    }

    return body;
};

/**
 * Schéma d'envoi d'OTP.
 *
 * @param {Object} body
 * @returns {Object}
 * @throws {Error}
 */
const sendOtpSchema = (body = {}) => {
    const {
        identifiant,
    } = body;

    if (!isValidIdentifier(identifiant)) {
        throw new Error(
            "Un email ou un numéro de téléphone valide est obligatoire."
        );
    }

    return body;
};

/**
 * Schéma de vérification OTP.
 *
 * @param {Object} body
 * @returns {Object}
 * @throws {Error}
 */
const verifyOtpSchema = (body = {}) => {
    const {
        identifiant,
        code,
    } = body;

    if (!isValidIdentifier(identifiant)) {
        throw new Error(
            "Un email ou un numéro de téléphone valide est obligatoire."
        );
    }

    if (!isValidOtp(code)) {
        throw new Error(
            "Le code OTP doit contenir exactement 6 chiffres."
        );
    }

    return body;
};

/**
 * Schéma de vérification d'une adresse email.
 *
 * @param {Object} body
 * @returns {Object}
 * @throws {Error}
 */
const verifyEmailSchema = (body = {}) => {
    const {
        email,
        code,
        role,
    } = body;

    if (!isValidEmail(email)) {
        throw new Error(
            "L'adresse email est invalide."
        );
    }

    if (!isValidOtp(code)) {
        throw new Error(
            "Le code OTP doit contenir exactement 6 chiffres."
        );
    }

    if (
        role !== undefined &&
        !isValidRole(role)
    ) {
        throw new Error(
            "Le rôle doit être 'bailleur' ou 'locataire'."
        );
    }

    return body;
};

/**
 * Schéma de vérification du téléphone.
 *
 * @param {Object} body
 * @returns {Object}
 * @throws {Error}
 */
const verifyTelephoneSchema = (body = {}) => {
    const {
        idToken,
        role,
    } = body;

    if (!isNonEmptyString(idToken)) {
        throw new Error(
            "Le token de vérification du téléphone est obligatoire."
        );
    }

    if (!isValidRole(role)) {
        throw new Error(
            "Le rôle doit être 'bailleur' ou 'locataire'."
        );
    }

    return body;
};

/**
 * Schéma de modification de l'identifiant.
 *
 * Au moins un nouvel identifiant doit être fourni.
 *
 * @param {Object} body
 * @returns {Object}
 * @throws {Error}
 */
const updateIdentifierSchema = (body = {}) => {
    const {
        email,
        telephone,
        lastEmail,
        lastTelephone,
    } = body;

    if (!email && !telephone) {
        throw new Error(
            "Un nouvel email ou un nouveau numéro de téléphone est obligatoire."
        );
    }

    if (
        email !== undefined &&
        email !== null &&
        !isValidEmail(email)
    ) {
        throw new Error(
            "La nouvelle adresse email est invalide."
        );
    }

    if (
        telephone !== undefined &&
        telephone !== null &&
        !isValidTelephone(telephone)
    ) {
        throw new Error(
            "Le nouveau numéro de téléphone est invalide."
        );
    }

    if (
        lastEmail !== undefined &&
        lastEmail !== null &&
        !isValidEmail(lastEmail)
    ) {
        throw new Error(
            "L'ancien email est invalide."
        );
    }

    if (
        lastTelephone !== undefined &&
        lastTelephone !== null &&
        !isValidTelephone(lastTelephone)
    ) {
        throw new Error(
            "L'ancien numéro de téléphone est invalide."
        );
    }

    return body;
};

/**
 * Schéma de modification du mot de passe.
 *
 * Compatible avec :
 * - currentPassword + newPassword
 * - password
 *
 * Le service reste responsable de vérifier
 * l'ancien mot de passe et de hasher le nouveau.
 *
 * @param {Object} body
 * @returns {Object}
 * @throws {Error}
 */
const updatePasswordSchema = (body = {}) => {
    const {
        currentPassword,
        newPassword,
        password,
    } = body;

    const passwordToValidate =
        newPassword || password;

    if (!isValidPassword(passwordToValidate)) {
        throw new Error(
            "Le nouveau mot de passe doit contenir au moins 8 caractères."
        );
    }

    if (
        currentPassword !== undefined &&
        !isNonEmptyString(currentPassword)
    ) {
        throw new Error(
            "Le mot de passe actuel est obligatoire."
        );
    }

    return body;
};

/**
 * Schéma de récupération du mot de passe.
 *
 * @param {Object} body
 * @returns {Object}
 * @throws {Error}
 */
const forgotPasswordSchema = (body = {}) => {
    const {
        identifiant,
        role,
    } = body;

    if (!isValidIdentifier(identifiant)) {
        throw new Error(
            "L'identifiant doit être un email ou un numéro de téléphone valide."
        );
    }

    if (!isValidRole(role)) {
        throw new Error(
            "Le rôle doit être 'bailleur' ou 'locataire'."
        );
    }

    return body;
};

/**
 * Middleware générique de validation.
 *
 * Le schema reçoit req.body et doit lever une erreur
 * lorsque les données sont invalides.
 *
 * @param {Function} schema
 * @returns {import("express").RequestHandler}
 */
const validate = (schema) => {
    return (req, res, next) => {
        try {
            if (!isObject(req.body)) {
                throw new Error(
                    "Les données envoyées sont invalides."
                );
            }

            schema(req.body);

            next();
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    };
};

module.exports = {
    ROLES_AUTORISES,

    isNonEmptyString,
    isValidEmail,
    isValidTelephone,
    isValidPassword,
    isValidRole,
    isValidIdentifier,
    isValidOtp,

    registerSchema,
    loginSchema,
    googleAuthSchema,
    sendOtpSchema,
    verifyOtpSchema,
    verifyEmailSchema,
    verifyTelephoneSchema,
    updateIdentifierSchema,
    updatePasswordSchema,
    forgotPasswordSchema,

    validate,
};