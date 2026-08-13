const { admin } = require("../config/firebase")
const  Timestamp  =  admin.firestore.Timestamp
class Candidature {
    constructor({
        idPublic,
        bailleurId,
        locataireId,
        type,
        message,
        visite,
        demande,
        annonceId
    }) {
        this.idPublic   = idPublic
        this.bailleurId  = bailleurId
        this.locataireId = locataireId
        this.type        = type
        this.message     = message
        this.visite      = visite
        this.demande     = demande
        this.annonceId = annonceId
    }

    toFirebase() {
        return {
            //  Référence 
            idPublic:   this.idPublic,
            bailleurId:  this.bailleurId,
            locataireId: this.locataireId,
            annonceId: this.annonceId,

            //  Type 
            type: this.type, // "visite" | "demande"

            //  Statut 
            statut: this.statut ?? "en_attente",
            // "en_attente" | "acceptee" | "refusee" | "annulee"

            vu:      this.vu      ?? false,
            message: this.message ?? "",
            delete: {
                [this.bailleurId]: false,
                [this.locataireId]: false
            },

            //  Dates 
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),

            //  Détails visite 
            ...(this.type === "visite" ? {
                visite: {
                    dateSouhaitee:   this.visite?.dateSouhaitee  ?? null,
                    heureSouhaitee:  this.visite?.heureSouhaitee ?? null,
                    horaireFlexible: this.visite?.horaireFlexible ?? false,
                    fraisVisite:     this.visite?.fraisVisite     ?? 0,
                    devise:    this.visite?.devise   ?? "XFA",
                }
            } : {}),

            //  Détails demande 
            ...(this.type === "demande" ? {
                demande: {
                    prix:   this.demande?.prix  ?? 0,
                    devise:    this.demande?.devise   ?? "XAF",
                    duree: this.demande?.duree?.unite  ?? "mois",
                    frequence:   this.demande?.frequence  ?? null,
                    caution:     this.demande?.caution    ?? 0,
                    min:         this.demande?.min        ?? 1,
                    fraisVisite: this.demande?.fraisVisite ?? 0,
                }
            } : {}),
            historique: [
                { date: new Date().toISOString(), action: "soumise", type: "info" }
            ],
        }
    }
}

module.exports = {Candidature}