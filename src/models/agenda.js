const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Evenement {
    constructor({
        idBien,
        auteurId,
        idPublic,
        type,
        titre,
        start,
        heure,
        duree,
        end,
        description
    }) {
        this.idBien      = idBien
        this.auteurId = auteurId
        this.idPublic   = idPublic
        this.type        = type
        this.titre       = titre
        this.end        = end
        this.start = start
        this.heure       = heure
        this.duree       = duree
        this.description = description
    }

    toFirebase() {
        return {
            // ── Références ───────────────────────────
            bienId:      this.idBien,
            auteurId: this.auteurId ?? null, // null si événement général
            idPublic:   this.idPublic,           // idPublic du bien
            description: this.description,

            // ── Type ─────────────────────────────────
            type: this.type,
            // "visite" | "signature" | "remise_cles" | "autre"

            // ── Détails ───────────────────────────────
            titre: this.titre ?? "",
            start:  this.start  ?? null,
            heure: this.heure ?? null,
            duree: this.duree  ?? 60,
            end: this.end ?? null,

            // ── Statut ───────────────────────────────
            statut: "planifie",
            // "planifie" | "confirme" | "annule" | "termine"

            // ── Dates ────────────────────────────────
            createdAt: timestamp.now(),
            updatedAt: timestamp.now(),
        }
    }
}
module.exports = {Evenement}