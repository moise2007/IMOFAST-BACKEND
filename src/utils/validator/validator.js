/**
 * Vérifie si l'email est valide
 * @param {String} email
 * @returns {Boolean}
 */
const validatorEmail = (email) => {
    if (typeof email !== "string") return false;
    const regex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    return regex.test(email.trim());
};

/**
 * Vérifie si le numéro de téléphone est valide
 * @param {String} number
 * @param {String} country
 * @returns {Boolean}
 */
const validatorPhoneNumber = (number, country = "cameroun") => {
    if (typeof number !== "string") return false;

    const regexTableau = {
        cameroun: /^6[0-9]{8}$/,
    };

    const regex = regexTableau[country];
    if (!regex) return false; // pays non supporté -> invalide plutôt que crash

    return regex.test(number.trim());
};

/**
 * Vérifie si le mot de passe respecte les règles de sécurité
 * (min 8, max 32, au moins 1 maj, 1 min, 1 chiffre, 1 caractère spécial)
 * @param {String} password
 * @returns {Boolean}
 */
const validatorPassword = (password) => {
    if (typeof password !== "string") return false;

    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).+$/;
    return password.length >= 8 && password.length <= 128 && regex.test(password);
};
function validateText(value, { min = 1, max = 100, required = true, fieldName = "Ce champ" } = {}) {
  if (value === undefined || value === null) {
    return required ? `${fieldName} est requis` : null;
  }
  if (typeof value !== "string") {
    return `${fieldName} doit être une chaîne de caractères`;
  }
  const text = value.trim();
  if (!text && required) {
    return `${fieldName} est requis`;
  }
  if (!text && !required) {
    return null;
  }
  if (text.length < min) {
    return `${fieldName} doit contenir au moins ${min} caractères`;
  }
  if (text.length > max) {
    return `${fieldName} doit contenir au maximum ${max} caractères`;
  }

  // Bloque les clés utilisées dans certaines injections
  if (/[{}[\]]/.test(text)) {
    return `${fieldName} contient des caractères non autorisés`;
  }

  return null;
}


module.exports = { validatorEmail, validatorPhoneNumber, validatorPassword, validateText };