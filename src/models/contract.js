const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Contrat {
    constructor({
        bailleurId,
        locataireId,
        idPublic,
        bienId,
        dateDebut,
        dateFin,
    }) {
        this.bailleurId  = bailleurId
        this.locataireId = locataireId
        this.idPublic   = idPublic
        this.dateDebut   = dateDebut
        this.dateFin     = dateFin
        this.bienId =bienId
    }

    toFirebase() {
        return {
            // ── Références ───────────────────────────
            bailleurId:  this.bailleurId,
            locataireId: this.locataireId,
            idPublic:   this.idPublic, // idPublic du bien
            bienId: this.bienId,

            // ── Durée ─────────────────────────────────
            dateDebut: this.dateDebut ?? null,
            dateFin:   this.dateFin   ?? null,

            // ── Statut ───────────────────────────────
            statut: "actif", // "actif" | "termine" | "resilie"

            // ── Dates ────────────────────────────────
            createdAt: timestamp.now(),
            updatedAt: timestamp.now(),
            confirm : {
                locataire: false,
                bailleur: true
            },
        }
    }
}

module.exports = Contrat