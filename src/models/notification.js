const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Notification {
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
        this.destinataireId   = destinataireId
        this.typeDestinataire = typeDestinataire
        this.type             = type
        this.cibleId          = cibleId
        this.typeCible        = typeCible
        this.titre            = titre
        this.message          = message
        this.idPublic = idPublic
    }

    toFirebase() {
        return {
            // ── Destinataire ─────────────────────────
            destinataireId:   this.destinataireId,
            typeDestinataire: this.typeDestinataire, // "bailleur" | "locataire"
            idPublic: this.idPublic,

            // ── Type ─────────────────────────────────
            type: this.type,
            // "nouvelle_candidature"
            // "candidature_acceptee"
            // "candidature_refusee"
            // "nouveau_message"
            // "nouveau_commentaire"
            // "nouvelle_note"

            // ── Cible ─────────────────────────────────
            cibleId:   this.cibleId,   // id du bien, candidature, message...
            typeCible: this.typeCible, // "bien" | "candidature" | "message" | "commentaire"

            // ── Contenu ───────────────────────────────
            titre:   this.titre   ?? "",
            message: this.message ?? "",

            // ── Statut ───────────────────────────────
            lu: false,

            // ── Dates ────────────────────────────────
            createdAt: timestamp.now(),
        }
    }
}

module.exports = {Notification}