const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Annonce {
    constructor({
        bienId,
        bailleurId,
        titre,
        loyer,
        dateExpiration,
        description,
        devise,
        nature,
        verifie=false,
        idPublic,
        metaData = null,
    }) {
        this.bienId = bienId
        this.idPublic = idPublic
        this.loyer = loyer
        this.bailleurId = bailleurId
        this.titre = titre
        this.dateExpiration = dateExpiration
        this.description = description
        this.devise = devise ?? "XAF"
        this.nature = nature
        this.verifie = verifie
        this.metaData = metaData
    }

    toFirebase() {

        const prix = this.loyer.map((option)=>option?.prix).filter(p=>p!= null)
        const prixMin = Math.min(...prix)
        const prixMax = Math.max(...prix)

        let motCles = []

        function adapte(texte=""){
            return texte
            .toString()
            .replace(/,/g," ")
            .replace(/\./g," ")
            .replace(/:/g," ")
            .replace(/;/g," ")
        }

        motCles.push(...adapte(this.description).split(" "))
        motCles.push(...adapte(this.titre).split(" "))
        motCles.push(adapte(this.nature))
        motCles.push(...adapte(this.description).toLowerCase().split(" "))
        motCles.push(...adapte(this.titre).toLowerCase().split(" "))
        motCles.push(...adapte(this.description).normalize("NFD").split(" "))
        motCles.push(...adapte(this.titre).normalize("NFD").split(" "))  

        motCles = motCles.filter(word=>word?.length > 2)
        motCles = [...new Set(motCles)]


        return {
            //  Références 
            bienId:          this.bienId,
            bailleurId:      this.bailleurId,
            idPublic: this.idPublic,

            //  Contenu 
            titre:           this.titre,
            description: this.description,

            //  Produit automatiquement 
            status: "publier",      // "publier" | "suspendus" | "expirer" | "louer"
            estPubliee: true,
            datePublication: new Date().toISOString(),
            dateExpiration:  this.dateExpiration ?? null,
            likes: [],
            notes: [],
            metaData: {
                note: this.metaData?.note ?? 20
            },
            verifie: this.verifie,
            createdAt: timestamp.now(),
            updateAt: timestamp.now(),
            nature: this.nature ?? "location",
            recherche: {
                motCles: motCles,
                minPrix: prixMin,
                maxPrix:prixMax
            },

            //  Tarification 
            loyer: this.loyer,
            devise: this?.devise ?? "XAF",

            // UX Data 
            statistiques : {
                vues: 0 ,
                commentaires: 0,
                favoris: 0,
                candidatures: 0,
                notes: 0,
                partager: 0
            },
        }
    }
}

module.exports = {Annonce}