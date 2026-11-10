const { admin } = require("../config/firebase");

const { generateId } = require("../utils/generateId");
const TimeStamp = admin.firestore.Timestamp;
class Media {
  constructor({
    nom,
    type,
    mimeType,
    taille,
    url,
    thumbnail = null,
    hash,
    proprietaireId,
    logementId = null,
  }) {
    this.nom = nom;
    this.type = type;
    this.mimeType = mimeType;
    this.taille = taille;
    this.url = url;
    this.thumbnail = thumbnail;

    this.hash = {
      algorithm: "SHA-256",
      value: hash,
    };

    this.proprietaireId = proprietaireId;
    this.logementId = logementId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toFirebase() {
    return {
      id: generateId("media"),
      nom: this.nom,
      type: this.type,
      mimeType: this.mimeType,
      taille: this.taille,
      url: this.url,
      thumbnail: this.thumbnail,
      hash: this.hash,
      proprietaireId: this.proprietaireId,
      logementId: this.logementId,
      createdAt: TimeStamp.now(),
      updatedAt: TimeStamp.now(),
    };
  }
}

module.exports = Media;