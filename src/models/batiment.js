const { createId } = require("@paralleldrive/cuid2");
const { admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

class Batiment {
  /**
   * @param {Object} data
   * @param {string} data.nom
   * @param {Object} data.localisation
   * @param {string} data.bailleurId
   * @param {*} [data.equipement]
   * @param {boolean} [data.gardien]
   * @param {boolean} [data.portail]
   * @param {boolean} [data.jardin]
   * @param {boolean} [data.piscine]
   * @param {string} [data.environement]
   * @param {boolean} [data.barriere]
   * @param {*} [data.dateConstruction]
   * @param {number} [data.prixGoudron]
   * @param {string} [data.role]
   */
  constructor({
    nom,
    localisation,
    bailleurId,
    equipement,
    gardien,
    portail,
    jardin,
    piscine,
    environement,
    barriere,
    dateConstruction,
    prixGoudron,
    role,
  }) {
    this.nom = nom;
    this.localisation = localisation;
    this.bailleurId = bailleurId;
    this.equipement = equipement;
    this.gardien = gardien;
    this.portail = portail;
    this.jardin = jardin;
    this.piscine = piscine;
    this.environement = environement;
    this.barriere = barriere;
    this.dateConstruction = dateConstruction;
    this.prixGoudron = prixGoudron;
    this.role = role;
  }

  /**
   * Transforme le modèle en document Firestore.
   *
   * @returns {Object}
   */
  toFireBase() {
    const now = Timestamp.now();

    return {
      idPublic: createId(),

      nom: this.nom,

      bailleurId: this.bailleurId,

      gestionnaires: [this.bailleurId],

      role: this.role,

      localisation: {
        quartier: this.localisation?.quartier ?? null,
        ville: this.localisation?.ville ?? null,
        pays: this.localisation?.pays ?? "cameroun",
        lon: this.localisation?.lon ?? null,
        lat: this.localisation?.lat ?? null,
        adresse: this.localisation?.adresse ?? null,
      },

      equipement: this.equipement ?? [],
      portail: this.portail ?? false,
      jardin: this.jardin ?? false,
      piscine: this.piscine ?? false,
      environement: this.environement ?? null,
      barriere: this.barriere ?? false,

      dateConstruction: this.dateConstruction ?? null,

      prixGoudron: this.prixGoudron,

      createdAt: now,
      updatedAt: now,

      legal: {
        titreFontier: null,
        permisConstruction: null,
      },

      delete: false,
    };
  }
}

module.exports = {Batiment};