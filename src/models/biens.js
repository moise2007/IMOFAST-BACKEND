const { admin } = require("../config/firebase")

const timestamp = admin.firestore.Timestamp
class Bien {
    constructor({
        bailleurId,
        localisation,
        images,
        exemplaire,
        superficie,
        securite,
        eau,
        videos,
        electricite,
        idPublic,
        devise,
        prixGoudron,
        estProcheGoudron,
        nature,
        chambres,
        salleBains,cuisines,
        salons,
        type,
        etage,
        etat,
        niveauFinition,
        equipements,
        environements,
        mode,
        tauxCompletude,
        description,
    }) {
        this.type = type
        this.bailleurId        = bailleurId
        this.localisation      = localisation
        this.images            = images
        this.exemplaire = exemplaire
        this.superficie        = superficie
        this.securite          = securite
        this.eau               = eau
        this.electricite       = electricite
        this.videos = videos
        this.idPublic = idPublic
        this.devise = devise
        this.estProcheGoudron = estProcheGoudron
        this.prixGoudron = prixGoudron
        this.nature= nature
        this.chambres= chambres
        this.cuisines = cuisines
        this.salons = salons
        this.salleBains = salleBains
        this.desccription = description
        this.etage = etage
        this.etat = etat
        this.environements = environements
        this.equipements = equipements
        this.niveauFinition = niveauFinition
        this.mode = mode
        this.tauxCompletude = tauxCompletude
    }

    toFirebase() {
        function getCle(object){
            const tableau = []
            Object.entries(object).forEach(([cle,value])=>{
                if(value){
                    tableau.push(cle)
                }
            })
            return tableau
        }
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
            ...getCle(this.environements),
            ...getCle(this.securite),
            ...getCle(this.equipements),
            adapte(this.type),
            adapte(this.nature),
            ...prefixes(this.localisation?.ville),
            ...prefixes(this.localisation?.quatier),
            ...adapte(this.localisation?.adresse).toLowerCase().split(" "),
            ...adapte(this.localisation?.ville).toLowerCase().split(" "),
            ...adapte(this.localisation?.quatier).toLowerCase().split(" "),
            ...adapte(this.localisation?.pays).toLowerCase().split(" "),
            ...adapte(this.localisation?.adresse).normalize("NFD").split(" "),
            ...adapte(this.localisation?.ville).normalize("NFD").split(" "),
            ...adapte(this.localisation?.quatier).normalize("NFD").split(" "),
            ...adapte(this.localisation?.pays).normalize("NFD").split(" "),
        ]
        this.localisation = {...this.localisation,quatier:this.localisation?.quatier?.toLowerCase()}

        motCles = motCles.filter(word=>word?.length > 2)
        motCles = [...new Set(motCles)]

        return {
            //  Référence 
            bailleurId:this.bailleurId,
            idPublic: this.idPublic,
            description: this.desccription,

            //  Localisation 
            localisation: {lon:null, lat:null,ville:null,adresse:null,quatier:null,...this.localisation}, 
            prixGoudron: this.prixGoudron,
            estProcheGoudron: this.estProcheGoudron,
            type: this.type,
            nature: this.nature,
            mode: this.mode,
            motCles,
            chambres :{
                nombre: this.chambres?.nombre ?? 1,
                image: this.chambres?.image ?? null
            },
            salons:{
                nombre: this.salons?.nombre ?? 0,
                image: this.salons?.image ?? null
            },
            salleBains:{
                nombre: this.salleBains?.nombre ?? 0,
                image: this.salleBains?.image ?? null
            },
            cuisines : {
                nombre: this.cuisines?.nombre ?? 0,
                image: this.cuisines?.image ?? null
            },
            

            //  Médias 
            images: this.images ?? {},          
            videos: this.videos ?? [],    
            

            //  Caractéristiques physiques 
            exemplaires: this.exemplaire ?? {occuper: 0, disponible: 1 , construction: 0},
            superficie:this.superficie ?? 0, // m²

            niveauFinition: this?.niveauFinition ?? "standard",
            etage:             this.etage ?? {min: null , max:null},
            // pour duplex/villa : nombre total d'étages du bien
            equipements: {
                lit: this.equipements?.lit ?? null,
                armoire: this.equipements?.armoire ?? null,
                bureau: this.equipements?.bureau ?? null,
                canape: this.equipements?.canape ?? null,
                tableChaises: this.equipements?.tableChaises ?? null,
                televiseur: this.equipements?.televiseur ?? null,
                climatiseur: this.equipements?.climatiseur ?? null,
                refrigerateur: this.equipements?.refrigerateur ?? null,
                machineALaver: this.equipements?.machineALaver ?? null,
                cuisineEquipee: this.equipements?.cuisineEquipee ?? null,
                wifi: this.equipements?.wifi?? null,
                parking: this.equipements?.parking ?? null,
                balcon: this.equipements?.balcon ?? null,
                terrasse: this.equipements?.terrasse ?? null,
                jardin: this.equipements?.jardin ?? null,
                piscine: this.equipements?.piscine ?? null,
                ascenseur: this.equipements?.ascenseur ?? null,
                autres: this.equipements?.autres ?? {}
            },

            //  Environnement proche 
            environements: {
                ecole: this.environements?.ecole?? null,
                marche: this.environements?.marche?? null,
                hopital: this.environements?.hopital?? null,
                axePrincipal: this.environements?.axePrincipal?? null,
                autres: this.environements?.autres?? {},
            },

            //  Réseaux 
            securite: this.securite ?? {gardien: null , camera: null, barriere:null},
            eau: this.eau ?? {type:null , prix:null},
            electricite: this.electricite ??{type:null , prix:null},
            devise: this.devise,
            hasPublication:false,
            idLocataire: null,
            canPublier: true,

            tauxCompletude: this.tauxCompletude ??  20,
            createdAt: timestamp.now(),
            updateAt: timestamp.now(),
        }
    }
}

module.exports= {Bien}