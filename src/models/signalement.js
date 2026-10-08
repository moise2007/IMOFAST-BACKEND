const { admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Représente un signalement effectué par un utilisateur
 * sur une ressource de l'application.
 */
class Signalement {
  /**
   * @param {Object} params
   * @param {string} params.idAuteur Identifiant public de l'auteur.
   * @param {string} params.idCible Identifiant public de la ressource signalée.
   * @param {string} params.idPublic Identifiant public du signalement.
   * @param {string} params.typeCible Type de ressource signalée.
   * @param {string} params.raison Motif du signalement.
   * @param {string} [params.description] Description complémentaire.
   */
  constructor({
    idAuteur,
    idCible,
    idPublic,
    typeCible,
    raison,
    description = "",
  }) {
    this.idPublic = idPublic;
    this.idAuteur = idAuteur;
    this.idCible = idCible;
    this.typeCible = typeCible;
    this.raison = raison;
    this.description = description;
  }

  /**
   * Transforme le signalement en document Firestore.
   *
   * @returns {Object}
   */
  toFirebase() {
    const now = Timestamp.now();

    return {
      idPublic: this.idPublic,

      // Références
      idAuteur: this.idAuteur,
      idCible: this.idCible,
      typeCible: this.typeCible,

      // Motif
      raison: this.raison,
      description: this.description,

      // Traitement
      statut: "en_attente",

      // Dates
      createdAt: now,
      updatedAt: now,
    };
  }
}

module.exports = {
  Signalement,
};