const { createId } = require("@paralleldrive/cuid2")
const { admin } = require("../config/firebase")
const Timestamp = admin.firestore.Timestamp

class Boutique {
    constructor({
        superficie,
        pays = "Cameroun",
        ville,
        quartier,
        lieuDit = null,
        lon = null,
        lat = null,
        distanceGoudron = null,
        etage = 0,
        nombrePieces = 1,
        parking = false,
        etat, 
        idCommun,
        eau = false,
        electricite = true,
        toilettes = false,
        climatisation = false,
        photos = [],
        videos = [],
        bailleurId,
        videosVirtuelle = {}
    }) {
        this.superficie = superficie
        this.pays = pays
        this.ville = ville
        this.quartier = quartier
        this.lieuDit = lieuDit
        this.lon = lon
        this.idCommun = idCommun
        this.etat = etat
        this.lat = lat
        this.distanceGoudron = distanceGoudron
        this.etage = etage
        this.nombrePieces = nombrePieces
        this.parking = parking
        this.eau = eau
        this.electricite = electricite
        this.toilettes = toilettes
        this.climatisation = climatisation
        this.photos = photos
        this.videos = videos
        this.bailleurId = bailleurId
        this.videosVirtuelle = videosVirtuelle
    }

    toFireBase() {
        return {
            typeBien: "boutique",
            idPublic: `Bout_${createId()}`,
            bailleurId: this.bailleurId,
            etat: this.etat,
            idCommun : this.idCommun,
            superficie: this.superficie,

            localisation: {
                pays: this.pays,
                ville: this.ville,
                quartier: this.quartier,
                lieuDit: this.lieuDit,
                lon: this.lon,
                lat: this.lat
            },

            distanceGoudron: this.distanceGoudron,

            etage: this.etage,
            nombrePieces: this.nombrePieces,

            equipements: {
                parking: this.parking,
                eau: this.eau,
                electricite: this.electricite,
                toilettes: this.toilettes,
                climatisation: this.climatisation
            },


            photos: this.photos,
            videos: this.videos,
            videosVirtuelle: this.videosVirtuelle,

            createdAt: Timestamp.now(),
            updateAt: Timestamp.now()
        }
    }
}

module.exports = { Boutique }