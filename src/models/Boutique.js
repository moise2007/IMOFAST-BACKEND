const { createId } = require("@paralleldrive/cuid2")
const { admin } = require("../config/firebase")
const Timestamp = admin.firestore.Timestamp

class Boutique {
    constructor({
        superficie,
        pays = "Cameroun",
        ville,
        quartier,
        gardien= null,
        camera= null,
        eclairagePublic= null,
        adresse = null,
        lon = null,
        lat = null,
        prixGoudron = null,
        etage = {min:0, max: null},
        exemplaire = {occuper: 0, libre: 1, construction: 0},
        parking = false,
        idCommun,
        eau = false,
        electricite = {type:"postpayer" , prix:null},
        toilettes = {type:"postpayer" , prix:null},
        climatisation = false,
        espaceStockage = null,
        marche = null,
        supermarche = null,
        banque = null,
        pharmacie = null, 
        ecole = null,
        station = null,
        hopital = null,
        images = [],
        videos = [],
        bailleurId,
        videosVirtuelle = {}
    }) {
        this.superficie = superficie
        this.eclairagePublic = eclairagePublic
        this.camera = camera
        this.gardien = gardien
        this.pays = pays
        this.ville = ville
        this.quartier = quartier
        this.adresse = adresse
        this.lon = lon
        this.idCommun = idCommun
        this.lat = lat
        this.prixGoudron = prixGoudron
        this.etage = etage
        this.supermarche = supermarche,
        this.hopital = hopital
        this.banque = banque
        this.ecole = ecole
        this.station = station
        this.pharmacie = pharmacie,
        this.exemplaire = exemplaire
        this.parking = parking
        this.eau = eau
        this.electricite = electricite
        this.toilettes = toilettes
        this.climatisation = climatisation
        this.images = images
        this.videos = videos
        this.espaceStockage =  espaceStockage
        this.bailleurId = bailleurId
        this.marche = marche
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
            typeBien: "boutique",
            idPublic: `Bout_${createId()}`,
            bailleurId: this.bailleurId,
            idCommun : this.idCommun,
            superficie: this.superficie,
            motCles,
            localisation: {
                pays: this.pays,
                ville: this.ville,
                quartier: this.quartier,
                adresse: this.adresse,
                lon: this.lon,
                lat: this.lat
            },
            evironement: {
                marche: this.marche,
                supermarche: this.supermarche,
                hopital: this.hopital,
                banque : this.banque,
                ecole : this.banque,
                station: this.station,
                pharmacie:  this.pharmacie,
            },
            securite: {
                eclairagePublic: this.eclairagePublic,
                camera: this.camera,
                gardien: this.gardien
            },

            prixGoudron: this.prixGoudron,

            etage: this.etage,
            exemplaire: this.exemplaire,

            equipements: {
                parking: this.parking,
                eau: this.eau,
                electricite: this.electricite,
                toilettes: this.toilettes,
                espaceStockage: this.espaceStockage,
                climatisation: this.climatisation
            },


            images: this.images,
            videos: this.videos,
            videosVirtuelle: this.videosVirtuelle,

            createdAt: Timestamp.now(),
            updateAt: Timestamp.now()
        }
    }
}

module.exports = { Boutique }