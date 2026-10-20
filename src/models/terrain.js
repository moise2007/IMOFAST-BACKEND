const  {createId} = require("@paralleldrive/cuid2")
const  {admin } = require("../config/firebase")
const Timestamp = admin.firestore.Timestamp
class Terrain {
    constructor({
        superficie,
        forme,
        dimension,
        exemplaire,
        idCommun,
        pays = "Cameroun",
        ville,
        quartier,
        titreFontier=false,
        adresse = null,
        lon = null,
        lat = null,
        distanceGoudron = null,
        images = [],
        videos = [],
        bailleurId,
        videosVirtuelle = {}
    }) {
        this.superficie = superficie
        this.forme = forme
        this.exemplaire = exemplaire,
        this.idCommun = idCommun
        this.dimension = dimension
        this.pays = pays
        this.ville = ville
        this.quartier = quartier
        this.adresse = adresse
        this.lon = lon
        this.lat = lat
        this.titreFontier = titreFontier
        this.bailleurId = bailleurId
        this.distanceGoudron = distanceGoudron
        this.images = images
        this.videos = videos
        this.videosVirtuelle = videosVirtuelle
    }

    toFireBase() {
        function adapte(texte=""){
            return texte
            .toString()
            .replace(/[,.:;]/g, " ")
            .trim();
        }
        function prefixes(mot = "") {
            mot = mot.toLowerCase();
            const resultat = [];

            for (let i = 1; i <= mot.length; i++) {
                resultat.push(mot.slice(0, i));
            }
            return resultat;
        }

        let motCles = [
            ...prefixes(this.ville),
            ...prefixes(this.quatier),
            ...adapte(this.adresse).toLowerCase().split(" "),
            ...adapte(this.ville).toLowerCase().split(" "),
            ...adapte(this.quartier).toLowerCase().split(" "),
            ...adapte(this.pays).toLowerCase().split(" "),
            ...adapte(this.adresse).normalize("NFD").split(" "),
            ...adapte(this.ville).normalize("NFD").split(" "),
            ...adapte(this.quartier).normalize("NFD").split(" "),
            ...adapte(this.pays).normalize("NFD").split(" "),
        ]

        motCles = motCles.filter(word=>word?.length > 2)
        motCles = [...new Set(motCles)]

        return {
            idPublic: `Terr_${createId()}`,
            bailleurId: this.bailleurId,
            typeBien: "terrain",
            exemplaire: {libre: this.exemplaire},
            idCommun: this.idCommun,
            superficie: this.superficie,
            titreFontier: this.titreFontier,
            forme: this.forme,
            dimension: this.dimension,
            motCles,

            localisation: {
                pays: this.pays,
                ville: this.ville,
                quartier: this.quartier,
                adresse: this.adresse,
                lon: this.lon,
                lat: this.lat,
            },

            distanceGoudron: this.distanceGoudron,

            images: this.images,
            videos: this.videos,
            videosVirtuelle: this.videosVirtuelle,

            createdAt: Timestamp.now(),
            updateAt: Timestamp.now()
        }
    }
}

module.exports = { Terrain }