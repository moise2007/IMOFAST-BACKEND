const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Conversation {
    constructor({
        locataireId,
        bailleurId,
        idPublic,
    }) {
        this.locataireId  = locataireId
        this.bailleurId = bailleurId
        this.idPublic = idPublic
    }

    toFirebase() {
        return {
            // Participants
            locataireId:    this.locataireId,
            bailleurId:   this.bailleurId,
            idPublic: this.idPublic,
            idParticipants: [this.locataireId, this.bailleurId],

            // Dernier message (aperçu)
            dernierMessage: {
                contenu:   null,
                type:      null,
                idAuteur:  null,
                createdAt: null,
            },
            delete: {
                [this.bailleurId] : false,
                [this.locataireId]: false,
            },

            // Non lus
            nonLus: {
                [this.locataireId]:  0,
                [this.bailleurId]: 0,
            },

            // Dates
            createdAt: timestamp.now(),
            updatedAt: timestamp.now(),
        }
    }
}

module.exports = {Conversation}