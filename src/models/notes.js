const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Note {
    constructor({
        auteurId,
        cibleId,
        typeCible,
        valeur,
        idPublic,
    }) {
        this.auteurId  = auteurId
        this.cibleId   = cibleId
        this.typeCible = typeCible
        this.valeur    = valeur
        this.idPublic = idPublic
    }

    toFirebase() {
        return {
            // ── Référence ────────────────────────────
            auteurId:  this.auteurId,
            idPublic: this.idPublic,
            cibleId:   this.cibleId,
            typeCible: this.typeCible, // "bien" | "profil"

            // ── Valeur ────────────────────────────────
            valeur: this.valeur, // 1 | 2 | 3 | 4 | 5

            // ── Dates ────────────────────────────────
            createdAt: timestamp.now(),
            updateAt: timestamp.now()
        }
    }
}

module.exports = {Note}