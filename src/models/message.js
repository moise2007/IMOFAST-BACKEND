const { admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Types de messages supportés par la messagerie.
 *
 * @typedef {"texte"|"image"|"video"|"audio"|"lien_annonce"|"lien_profil"} MessageType
 */

/**
 * Représente un message d'une conversation.
 */
class Message {
  /**
   * @param {Object} data
   * @param {string} data.conversationId - Identifiant public de la conversation.
   * @param {string} data.auteurId - Identifiant public de l'auteur.
   * @param {MessageType} data.type - Type du message.
   * @param {string} [data.contenu] - Contenu texte.
   * @param {Object} [data.medias] - Informations du média.
   * @param {Object} [data.lien] - Informations du lien.
   * @param {string} data.idPublic - Identifiant public du message.
   * @param {string|null} [data.repondsA=null] - Identifiant du message auquel on répond.
   */
  constructor({
    conversationId,
    auteurId,
    type,
    contenu,
    medias = null,
    lien = null,
    idPublic,
    repondsA = null,
  }) {
    this.conversationId = conversationId;
    this.auteurId = auteurId;
    this.type = type;
    this.contenu = contenu;
    this.medias = medias;
    this.lien = lien;
    this.idPublic = idPublic;
    this.repondsA = repondsA;
  }

  /**
   * Transforme le message en document Firestore.
   *
   * @returns {Object}
   */
  toFirebase() {
    const now = Timestamp.now();

    const data = {
      idPublic: this.idPublic,
      conversationId: this.conversationId,
      auteurId: this.auteurId,

      type: this.type,
      repondsA: this.repondsA,

      contenu: this.contenu ?? "",

      lu: false,
      supprime: false,

      createdAt: now,

      /**
       * Date limite de modification.
       * Le service pourra ensuite comparer cette valeur
       * avec la date actuelle.
       */
      expiredAt: Timestamp.fromMillis(
        now.toMillis() + 10 * 60 * 1000
      ),
    };

    if (
      ["image", "video", "audio"].includes(this.type)
    ) {
      data.medias = {
        url: this.medias?.url ?? null,
        miniature: this.medias?.miniature ?? null,
        taille: this.medias?.taille ?? null,
        duree: this.medias?.duree ?? null,
      };
    }

    if (
      ["lien_annonce", "lien_profil"].includes(this.type)
    ) {
      data.lien = {
        idPublic: this.lien?.idPublic ?? null,
        titre: this.lien?.titre ?? null,
        photoProfil: this.lien?.photoProfil ?? null,
        nature: this.lien?.nature ?? null,
        localisation: this.lien?.localisation ?? null,
        prix: this.lien?.prix ?? null,
      };
    }

    return data;
  }
}

module.exports = {Message};