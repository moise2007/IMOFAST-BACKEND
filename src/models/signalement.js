const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Signalement {
    constructor({
        idAuteur,
        idCible,
        idPublic,
        typeCible,
        raison,
        description,
    }) {
        this.idPublic = idPublic
        this.idAuteur     = idAuteur
        this.idCible      = idCible
        this.typeCible    = typeCible
        this.raison       = raison
        this.description  = description
    }

    toFirebase() {
        return {
            // ── Références ───────────────────────────
            idAuteur:  this.idAuteur,
            idCible:   this.idCible,
            typeCible: this.typeCible, // "bien" | "profil"
            idPublic : this.idPublic,

            // ── Motif ─────────────────────────────────
            raison: this.raison,
            // "contenu_inapproprie" | "arnaque" | "fausses_informations"
            // "harcelement" | "doublon" | "autre"

            description: this.description ?? "",

            // ── Statut ───────────────────────────────
            statut: "en_attente",
            // "en_attente" | "traite" | "rejete"

            // ── Dates ────────────────────────────────
            createdAt: timestamp.now(),
            updatedAt: timestamp.now(),
        }
    }
}

module.exports = {Signalement}