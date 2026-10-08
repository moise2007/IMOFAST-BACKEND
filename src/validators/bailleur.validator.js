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
 * Valide les données de modification du profil bailleur.
 *
 * @param {Object} body
 * @returns {boolean}
 * @throws {Error}
 */
const validateUpdateDataBailleur = (body = {}) => {
    const {
        nom,
        prenom,
        email,
        telephone,
        sexe,
        langue,
        autreNumero,
        devise,
        photoProfil,
        dateNaissance,
        nomAgence,
        localisation,
        cni,
        typeProfil,
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
        throw new Error("L'adresse email est invalide.");
    }

    if (
        telephone !== undefined &&
        telephone !== null &&
        !isNonEmptyString(telephone)
    ) {
        throw new Error("Le numéro de téléphone est invalide.");
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
        devise !== undefined &&
        devise !== null &&
        !isNonEmptyString(devise)
    ) {
        throw new Error("La devise est invalide.");
    }

    if (
        typeProfil !== undefined &&
        typeProfil !== null &&
        !isNonEmptyString(typeProfil)
    ) {
        throw new Error("Le type de profil est invalide.");
    }

    if (
        cni !== undefined &&
        (typeof cni !== "object" || Array.isArray(cni))
    ) {
        throw new Error("Les données de la CNI sont invalides.");
    }

    return true;
};

/**
 * Valide les données nécessaires à la suppression
 * du compte bailleur.
 *
 * @param {Object} body
 * @returns {boolean}
 * @throws {Error}
 */
const validateDeleteBailleur = (body = {}) => {
    const {
        password,
    } = body;

    if (
        password !== undefined &&
        !isNonEmptyString(password)
    ) {
        throw new Error("Le mot de passe est invalide.");
    }

    return true;
};

/**
 * Valide l'identifiant d'un bailleur.
 *
 * @param {Object} params
 * @returns {boolean}
 * @throws {Error}
 */
const validateBailleurId = (params = {}) => {
    if (!isNonEmptyString(params.id)) {
        throw new Error(
            "L'identifiant du bailleur est obligatoire."
        );
    }

    return true;
};

module.exports = {
    isNonEmptyString,
    isValidEmail,
    validateUpdateDataBailleur,
    validateDeleteBailleur,
    validateBailleurId,
};