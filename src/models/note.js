const { admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Représente une note attribuée par un utilisateur
 * à une cible de l'application.
 */
class Note {
  /**
   * @param {Object} params
   * @param {string} params.auteurId
   * @param {string} params.cibleId
   * @param {string} params.typeCible
   * @param {number} params.valeur
   * @param {string} params.idPublic
   */
  constructor({
    auteurId,
    cibleId,
    typeCible,
    valeur,
    idPublic,
  }) {
    this.auteurId = auteurId;
    this.cibleId = cibleId;
    this.typeCible = typeCible;
    this.valeur = valeur;
    this.idPublic = idPublic;
  }

  /**
   * Transforme l'entité en document Firestore.
   *
   * @returns {Object}
   */
  toFirebase() {
    const now = Timestamp.now();

    return {
      auteurId: this.auteurId,
      idPublic: this.idPublic,
      cibleId: this.cibleId,
      typeCible: this.typeCible,

      valeur: this.valeur,

      createdAt: now,
      updatedAt: now,
    };
  }
}

module.exports = {
  Note,
};