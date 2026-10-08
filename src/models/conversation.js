const { admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Représente une conversation entre un bailleur et un locataire.
 */
class Conversation {
  /**
   * @param {Object} data
   * @param {string} data.locataireId - Identifiant public du locataire.
   * @param {string} data.bailleurId - Identifiant public du bailleur.
   * @param {string} data.idPublic - Identifiant public de la conversation.
   */
  constructor({ locataireId, bailleurId, idPublic }) {
    this.idPublic = idPublic;
    this.locataireId = locataireId;
    this.bailleurId = bailleurId;
  }

  /**
   * Transforme la conversation en document Firestore.
   *
   * @returns {Object} Document prêt à être enregistré dans Firestore.
   */
  toFirebase() {
    const now = Timestamp.now();

    return {
      idPublic: this.idPublic,

      locataireId: this.locataireId,
      bailleurId: this.bailleurId,

      idParticipants: [this.locataireId, this.bailleurId],

      dernierMessage: {
        contenu: null,
        type: null,
        idAuteur: null,
        createdAt: null,
      },

      delete: {
        [this.locataireId]: false,
        [this.bailleurId]: false,
      },

      nonLus: {
        [this.locataireId]: 0,
        [this.bailleurId]: 0,
      },

      createdAt: now,
      updatedAt: now,
    };
  }
}

module.exports = {
  Conversation,
};