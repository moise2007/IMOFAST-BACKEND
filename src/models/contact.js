const { admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Représente un message envoyé depuis le formulaire
 * de contact de l'application.
 */
class Contact {
  /**
   * @param {Object} params
   * @param {string} params.nom
   * @param {string} params.email
   * @param {string} params.sujet
   * @param {string} params.message
   * @param {string} [params.idPublic]
   */
  constructor({
    nom,
    email,
    sujet,
    message,
    idPublic,
  }) {
    this.idPublic = idPublic;
    this.nom = nom;
    this.email = email;
    this.sujet = sujet;
    this.message = message;
  }

  /**
   * Transforme le contact en document Firestore.
   *
   * @returns {Object}
   */
  toFirebase() {
    const now = Timestamp.now();

    return {
      idPublic: this.idPublic,
      nom: this.nom,
      email: this.email,
      sujet: this.sujet,
      message: this.message,

      /**
       * Statut initial du contact.
       */
      statut: "nouveau",

      createdAt: now,
      updatedAt: now,
    };
  }
}

module.exports = {Contact,};