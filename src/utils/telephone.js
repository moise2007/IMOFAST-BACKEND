/**
 * Normalise un numéro de téléphone.
 *
 * Supprime les espaces, tirets, parenthèses et autres
 * caractères de présentation afin de conserver un format
 * exploitable par l'application.
 *
 * @param {string} telephone - Numéro de téléphone à normaliser.
 * @returns {string|null} Numéro normalisé ou null si la valeur est vide.
 */
const normalizeTelephone = (telephone) => {
    if (!telephone || typeof telephone !== "string") {
        return null;
    }

    const tel =  telephone
        .trim()
        .replace(/[\s\-().]/g, "");
    
    return tel.startsWith("+237") ? tel : `+237${tel}`
};

module.exports = {
    normalizeTelephone,
};