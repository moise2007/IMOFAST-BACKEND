const { admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Représente un commentaire.
 */
class Commentaire {
  /**
   * @param {Object} data
   * @param {string} data.auteurId - Identifiant public de l'auteur.
   * @param {string} data.role - Rôle de l'auteur.
   * @param {string} data.cibleId - Identifiant public de la cible.
   * @param {string} data.idPublic - Identifiant public du commentaire.
   * @param {"profil"|"locataire"|"annonce"|"bien"|"bailleur"} data.typeCible
   * @param {string} data.message - Contenu du commentaire.
   * @param {string} [data.nom] - Nom de l'auteur.
   * @param {string} [data.prenom] - Prénom de l'auteur.
   * @param {string} [data.photoProfil] - Photo de profil de l'auteur.
   */
  constructor({
    auteurId,
    role,
    cibleId,
    idPublic,
    typeCible,
    message,
    nom,
    prenom,
    photoProfil,
  }) {
    this.idPublic = idPublic;
    this.auteurId = auteurId;
    this.role = role;
    this.cibleId = cibleId;
    this.typeCible = typeCible;
    this.message = message;
    this.nom = nom;
    this.prenom = prenom;
    this.photoProfil = photoProfil;
  }

  /**
   * Transforme le commentaire en document Firestore.
   *
   * @returns {Object} Document prêt à être enregistré dans Firestore.
   */
  toFirebase() {
    const now = Timestamp.now();

    return {
      idPublic: this.idPublic,

      auteurId: this.auteurId,
      role: this.role,

      cibleId: this.cibleId,
      typeCible: this.typeCible,

      nom: this.nom ?? null,
      prenom: this.prenom ?? null,
      photoProfil: this.photoProfil ?? null,

      message: this.message,

      reponses: [],

      createdAt: now,
      updatedAt: now,
    };
  }
}

module.exports = {Commentaire};