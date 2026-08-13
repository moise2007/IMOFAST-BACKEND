const { admin } = require("../config/firebase")

const Timestamp = admin.firestore.Timestamp
class Commentaire {
    constructor({
        auteurId,
        role,
        cibleId,
        idPublic,
        typeCible,
        message,
        nom, 
        prenom, 
        photoProfil
    }) {
        this.idPublic = idPublic
        this.nom = nom
        this.prenom = prenom
        this.photoProfil = photoProfil
        this.auteurId  = auteurId
        this.cibleId   = cibleId
        this.role = role
        this.typeCible = typeCible
        this.message   = message
    }

    toFirebase() {
        return {
            // ── Référence ────────────────────────────
            auteurId:  this.auteurId,
            cibleId:   this.cibleId,
            idPublic : this.idPublic,
            role : this.role,
            nom: this.nom,
            prenom: this.prenom,
            photoProfil:this.photoProfil,
            typeCible: this.typeCible, // "bien" | "profil"

            // ── Contenu ───────────────────────────────
            message: this.message ?? "",

            // ── Réponses (1 niveau) ───────────────────
            reponses: [],
            // { auteurId, message, createdAt }

            // ── Dates ────────────────────────────────
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        }
    }
}
module.exports = {Commentaire}