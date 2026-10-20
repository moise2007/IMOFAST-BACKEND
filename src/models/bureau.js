const { createId } = require("@paralleldrive/cuid2")
const { admin } = require("../config/firebase")
const Timestamp = admin.firestore.Timestamp

class Bureau {
    constructor({
        superficie,
        dimension,
        pays = "Cameroun",
        ville,
        quartier,
        adresse = null,
        lon = null,
        lat = null,
        distanceGoudron = null,
        etape = {min: 0, max: null},
        salleReunion = false,
        accueil = false,
        parking = false,
        eau = {type:"postpayer" , prix:null},
        electricite = {type:"postpayer" , prix:null},
        toilettes = false,
        climatisation = false,
        internet = false,
        images = [],
        videos = [],
        bailleurId,
        idCommun,
        exemplaire =  {occuper: 0, libre: 1, construction: 0},
        videosVirtuelle = {}
    }) {
        this.superficie = superficie
        this.dimension = dimension
        this.pays = pays
        this.ville = ville
        this.quartier = quartier
        this.adresse = adresse
        this.lon = lon
        this.lat = lat
        this.distanceGoudron = distanceGoudron
        this.etape = etape
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
            ...prefixes(this.quartier),
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
            typeBien: "bureau",
            idPublic: `Bur_${createId()}`,
            bailleurId: this.bailleurId,
            idCommun : this.idCommun,
            motCles,

            superficie: this.superficie,
            forme: null,
            dimension: this.dimension,
            exemplaire: this.exemplaire, // libre, occuper, construction

            localisation: {
                pays: this.pays,
                ville: this.ville,
                quartier: this.quartier,
                adresse: this.adresse,
                lon: this.lon,
                lat: this.lat
            },

            distanceGoudron: this.distanceGoudron,

            etape: this.etape,

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