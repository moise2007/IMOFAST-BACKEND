const { createId } = require("@paralleldrive/cuid2")
const { admin } = require("../config/firebase")
const Timestamp = admin.firestore.Timestamp

class Bureau {
    constructor({
        superficie,
        forme,
        dimension,
        pays = "Cameroun",
        ville,
        quartier,
        lieuDit = null,
        lon = null,
        lat = null,
        distanceGoudron = null,
        etape = 0,
        nombrePieces = 1,
        salleReunion = false,
        accueil = false,
        parking = false,
        eau = false,
        electricite = true,
        toilettes = false,
        climatisation = false,
        internet = false,
        images = [],
        videos = [],
        bailleurId,
        idCommun,
        exemplaire,
        videosVirtuelle = {}
    }) {
        this.superficie = superficie
        this.forme = forme
        this.dimension = dimension
        this.pays = pays
        this.ville = ville
        this.quartier = quartier
        this.lieuDit = lieuDit
        this.lon = lon
        this.lat = lat
        this.distanceGoudron = distanceGoudron
        this.etape = etape
        this.nombrePieces = nombrePieces
        this.salleReunion = salleReunion
        this.accueil = accueil
        this.parking = parking
        this.eau = eau
        this.electricite = electricite
        this.toilettes = toilettes
        this.climatisation = climatisation
        this.internet = internet
        this.images = images
        this.videos = videos
        this.bailleurId = bailleurId
        this.idCommun = idCommun
        this.exemplaire = exemplaire
        this.videosVirtuelle = videosVirtuelle
    }

    toFireBase() {
        return {
            typeBien: "bureau",
            idPublic: `Bur_${createId()}`,
            bailleurId: this.bailleurId,
            idCommun : this.idCommun,

            superficie: this.superficie,
            forme: this.forme,
            dimension: this.dimension,
            exemplaire: this.etat, // libre, occuper, construction

            localisation: {
                pays: this.pays,
                ville: this.ville,
                quartier: this.quartier,
                lieuDit: this.lieuDit,
                lon: this.lon,
                lat: this.lat
            },

            distanceGoudron: this.distanceGoudron,

            etape: this.etape,
            nombrePieces: this.nombrePieces,

            equipements: {
                salleReunion: this.salleReunion,
                accueil: this.accueil,
                parking: this.parking,
                eau: this.eau,
                electricite: this.electricite,
                toilettes: this.toilettes,
                climatisation: this.climatisation,
                internet: this.internet
            },

            images: this.images,
            videos: this.videos,
            videosVirtuelle: this.videosVirtuelle,

            createdAt: Timestamp.now(),
            updateAt: Timestamp.now()
        }
    }
}

module.exports = { Bureau }