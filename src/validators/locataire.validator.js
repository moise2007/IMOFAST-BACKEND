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
 * Valide les données de modification d'un locataire.
 *
 * @param {Object} body
 * @returns {boolean}
 * @throws {Error}
 */
const validateUpdateLocataire = (body = {}) => {
    const {
        nom,
        prenom,
        email,
        telephone,
        sexe,
        langue,
        autreNumero,
        profession,
        dateNaissance,
        localisation,
        photoProfil,
    } = body;

    if (
        nom !== undefined &&
        !isNonEmptyString(nom)
    ) {
        throw new Error("Le nom est invalide.");
    }

    if (
        prenom !== undefined &&
        !isNonEmptyString(prenom)
    ) {
        throw new Error("Le prénom est invalide.");
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
        !isNonEmptyString(telephone)
    ) {
        throw new Error(
            "Le numéro de téléphone est invalide."
        );
    }

    if (
        sexe !== undefined &&
        sexe !== null &&
        !isNonEmptyString(sexe)
    ) {
        throw new Error("Le sexe est invalide.");
    }

    if (
        langue !== undefined &&
        langue !== null &&
        !isNonEmptyString(langue)
    ) {
        throw new Error("La langue est invalide.");
    }

    if (
        profession !== undefined &&
        profession !== null &&
        !isNonEmptyString(profession)
    ) {
        throw new Error(
            "La profession est invalide."
        );
    }

    return true;
};

/**
 * Valide les données nécessaires à la suppression
 * d'un compte locataire.
 *
 * @param {Object} body
 * @returns {boolean}
 * @throws {Error}
 */
const validateDeleteLocataire = (body = {}) => {
    const {
        password,
    } = body;

    if (
        password !== undefined &&
        !isNonEmptyString(password)
    ) {
        throw new Error(
            "Le mot de passe est invalide."
        );
    }

    return true;
};

/**
 * Valide l'identifiant d'un locataire.
 *
 * @param {Object} params
 * @returns {boolean}
 * @throws {Error}
 */
const validateLocataireId = (params = {}) => {
    if (!isNonEmptyString(params.id)) {
        throw new Error(
            "L'identifiant du locataire est obligatoire."
        );
    }

    return true;
};

module.exports = {
    isNonEmptyString,
    isValidEmail,
    validateUpdateLocataire,
    validateDeleteLocataire,
    validateLocataireId,
};