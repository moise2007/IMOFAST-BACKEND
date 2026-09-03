const { createId } = require("@paralleldrive/cuid2");
const { admin } = require("../config/firebase");
const Timestamp = admin.firestore.Timestamp

class Batiment{
    constructor({
        nom, 
        localisation,
        bailleurId,
        equipement,
        gardien,
        portail,
        jardin,
        piscine,
        environement,
        barriere,
        dateConstruction,
        prixGoudron,
        role,
    }){
        this.nom = nom;
        this.localisation = localisation;
        this.bailleurId = bailleurId;
        this.equipement = equipement;
        this.gardien = gardien;
        this.portail = portail;
        this.jardin = jardin;
        this.piscine = piscine;
        this.environement = environement;
        this.barriere = barriere;
        this.dateConstruction = dateConstruction;
        this.prixGoudron = prixGoudron;
        this.role = role;
    }

    toFireBase(){
        return {
            // identifiant
            idPublic: createId(),
            nom: this.nom,
            bailleurId : this.bailleurId,
            gestionnaires: [this.bailleurId],
            role : this.role,

            // localisation
            localisation :{
                quartier: this.localisation?.quartier  ?? null,
                ville: this.localisation?.ville ?? null,
                pays : this.localisation?.pays ?? null,
                lon: this.localisation?.lon ?? null,
                lat: this.localisation?.lat ?? null,
                adresse: this.localisation?.adresse ?? null,
            },
            
            // caracteristiques
            equipement: this.equipement,
            portail: this.portail,
            jardin: this.jardin,
            piscine: this.piscine,
            environement: this.environement,
            barriere: this.barriere,

            // date de construction
            dateConstruction: this.dateConstruction,

            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),

            // legal
            legal :{
                titreFontier: null,
                permisConstruction: null,
            }, 

            delete: false,
            
        }
    }
}

module.exports = {Batiment}