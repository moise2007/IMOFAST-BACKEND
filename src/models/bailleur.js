const {createId} = require("@paralleldrive/cuid2")
const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Bailleur{
    constructor({
        nom,
        email,
        prenom,
        telephone,
        password,
        photoProfil,
        dateNaissance,
        localisation,
        uidGoogle,
        cni,
        typeProfil,
        emailVerifie,
        imageAnciensContrats,
        completudeProfilPourcentage,
    }){
        this.nom = nom 
        this.typeProfil = typeProfil
        this.prenom = prenom ?? ""
        this.email = email ?? ""
        this.telephone = telephone ?? ""
        this.password = password ?? null
        this.photoProfil = photoProfil ?? null
        this.dateNaissance = dateNaissance ?? null
        this.localisation = localisation ?? null
        this.uidGoogle = uidGoogle ?? null
        this.cni = cni ?? {}
        this.emailVerifie = emailVerifie ?? false
        this.imageAnciensContrats = imageAnciensContrats ?? null
        this.completudeProfilPourcentage = completudeProfilPourcentage ??null

    }

    toFirebase(){
        return{
            nom: this.nom,
            prenom: this.prenom,
            telephone : this.telephone ??"",
            email : this.email ?? "",
            typeProfil: this.typeProfil,
            password :  this.password,
            photoProfil : this.photoProfil ?? "",
            dateNaissance: this.dateNaissance ?? "",
            localisation:this.localisation ??null,
            uidGoogle: this.uidGoogle ?? null,
            idPublic: createId(),
            cni:{
                imageRecto: this.cni.imageRecto ?? null,
                imageVerso :  this.cni.imageVerso ?? null,
            },
            imageAnciensContrats : this.imageAnciensContrats,


            // donnees produite automatique
            status : "actif", // ou suspendus ou blaclister
            dateSuspension : null,
            dateBlackList: null,
            createAt: new Date(),

            verification: {
                emailVerifie : this.emailVerifie,
                telephoneVerifie : false,
                cniVerifie: false,
                cniVerifieAt: null,
                estDigne: false,
            },
            score:{
                global: 75,
                badge: "bronze",
            },
            notation:{
                moyenne: 0,
                nombresAvis : 0,
            },
            completudeProfilPourcentage : this.completudeProfilPourcentage,
            signalements: {
                total : 0,
                dernierSignalementAt : null ,
            },
            activite:{
                annoncesActives: 0,
                annnoncesTotal: 0,
                derniereActiviteAt:  null,
                delaiReponseHeure: null,
            },
            nombresSuspension: 0,
            role: "bailleur",
            enligne: false,
            forfait: {
                type: "aucun", // "mensuel","trimestriel","annuel",aucun
                fin: null,
            },
            createAt: timestamp.now(),
            updateAt: timestamp.now(),
            lastConnexion: timestamp.now()
        }
    }
}



module.exports = {Bailleur}