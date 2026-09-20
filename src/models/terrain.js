const  {createId} = require("@paralleldrive/cuid2")
const  {admin } = require("../config/firebase")
const Timestamp = admin.firestore.Timestamp
class Terrain {
    constructor({
        type,
        superficie,
        forme,
        dimension,
        etat,
        idCommun,
        pays = "Cameroun",
        ville,
        quartier,
        lieuDit = null,
        lon = null,
        lat = null,
        distanceGoudron = null,
        titre = false,
        photos = [],
        videos = [],
        bailleurId,
        videosVirtuelle = {}
    }) {
        this.type = type
        this.superficie = superficie
        this.forme = forme
        this.etat = etat,
        this.idCommun = idCommun
        this.dimension = dimension
        this.pays = pays
        this.ville = ville
        this.quartier = quartier
        this.lieuDit = lieuDit
        this.lon = lon
        this.lat = lat
        this.bailleurId = bailleurId
        this.distanceGoudron = distanceGoudron
        this.titre = titre
        this.photos = photos
        this.videos = videos
        this.videosVirtuelle = videosVirtuelle
    }

    toFireBase() {
        return {
            idPublic: `Terr_${createId()}`,
            bailleurId: this.bailleurId,
            typeBien: "terrain",
            etat: this.etat,
            idCommun: this.idCommun,
            type: this.type,
            superficie: this.superficie,
            forme: this.forme,
            dimension: this.dimension,

            localisation: {
                pays: this.pays,
                ville: this.ville,
                quartier: this.quartier,
                lieuDit: this.lieuDit,
                lon: this.lon,
                lat: this.lat,
            },

            distanceGoudron: this.distanceGoudron,
            titre: this.titre,

            photos: this.photos,
            videos: this.videos,
            videosVirtuelle: this.videosVirtuelle,

            createdAt: Timestamp.now(),
            updateAt: Timestamp.now()
        }
    }
}

module.exports = { Terrain }