const { admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Représente une notification envoyée à un utilisateur.
 */
class Notification {
  /**
   * @param {Object} params
   * @param {string} params.destinataireId
   * @param {string} params.typeDestinataire
   * @param {string} params.type
   * @param {string} [params.cibleId]
   * @param {string} [params.idPublic]
   * @param {string} [params.typeCible]
   * @param {string} [params.titre]
   * @param {string} [params.message]
   */
  constructor({
    destinataireId,
    typeDestinataire,
    type,
    cibleId,
    idPublic,
    typeCible,
    titre,
    message,
  }) {
    this.idPublic = idPublic;
    this.destinataireId = destinataireId;
    this.typeDestinataire = typeDestinataire;
    this.type = type;
    this.cibleId = cibleId;
    this.typeCible = typeCible;
    this.titre = titre;
    this.message = message;
  }

  /**
   * Transforme la notification en document Firestore.
   *
   * @returns {Object}
   */
  toFirebase() {
    const now = Timestamp.now();

    return {
      idPublic: this.idPublic,

      // Destinataire
      destinataireId: this.destinataireId,
      typeDestinataire: this.typeDestinataire,

      // Type de notification
      type: this.type,

      // Ressource concernée
      cibleId: this.cibleId ?? null,
      typeCible: this.typeCible ?? null,

      // Contenu
      titre: this.titre ?? "",
      message: this.message ?? "",

      // Statut
      lu: false,

      // Dates
      createdAt: now,
      updatedAt: now,
    };
  }
}

module.exports = {
  Notification,
};