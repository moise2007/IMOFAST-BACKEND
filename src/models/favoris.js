const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Favori {
    constructor({
        locataireId,
        annonceId,
        idPublic,
    }) {
        this.locataireId = locataireId
        this.annonceId      = annonceId
        this.idPublic = idPublic
    }

    toFirebase() {
        return {
            // Référence
            locataireId: this.locataireId,
            annonceId:      this.annonceId,
            idPublic : this.idPublic,
            isDemander: false,
            isVisiter: false,

            // Dates 
            createdAt: timestamp.now(),
        }
    }
}

module.exports = {Favori}