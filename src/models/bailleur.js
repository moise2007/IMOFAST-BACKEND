const {createId} = require("@paralleldrive/cuid2")
const { admin } = require("../config/firebase")
const { emptyNotes } = require("../utils/notesDistribution")
const { calculerCompletudeBailleur } = require("../utils/completudeProfil/completudeProfil.bailleur.utils")
const timestamp = admin.firestore.Timestamp
class Bailleur{
    constructor({
        nom,
        email,
        prenom,
        telephone,
        sexe,
        langue,
        autreNumero,
        devise,
        password,
        photoProfil,
        dateNaissance,
        nomAgence,
        localisation,
        uidGoogle,
        cni,
        typeProfil,
        emailVerifie,
        imageAnciensContrats,
        completudeProfilPourcentage,
    }){
        require("../utils/agencyName").assertAgencyName(nomAgence)
        this.nom = nom
        this.nomAgence = nomAgence ?? null
        this.typeProfil = typeProfil ?? "bailleur"
        this.prenom = prenom ?? null
        this.email = email ?? null
        this.autreNumero = autreNumero ?? null
        this.langue = langue ?? null
        this.devise = devise ?? null
        this.sexe = sexe ?? null
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

    toDataBase(){
        return{
            role: "bailleur",
      notification: { web: null, mobile: null },
      notifications: [],
      activiteInterne: { commentaires: 0, reponses: 0, notes: 0, conversationsCreees: 0, messagesEnvoyes: 0 },
      notificationPreferences: { ...require("../utils/notificationPreferences").DEFAULT_NOTIFICATION_PREFERENCES },
            onboarding: { etape: "bien", termine: false },
            nom: this.nom,
            prenom: this.prenom,
            nomAgence: this.nomAgence,
            telephone : this.telephone ??null,
            autreNumero: this.autreNumero,
            email : this.email ?? null,
            typeProfil: this.typeProfil,
            password :  this.password,
            photoProfil : this.photoProfil ?? null,
            dateNaissance: this.dateNaissance ?? null,
            localisation:this.localisation ??null,
            uidGoogle: this.uidGoogle ?? null,
            idPublic: createId(),
            cni:{
                imageRecto: this.cni.imageRecto ?? null,
                imageVerso :  this.cni.imageVerso ?? null,
            },
            imageAnciensContrats : this.imageAnciensContrats ?? [],


            // donnees produite automatique
            status : "actif", // ou suspendus ou blaclister
            dateSuspension : null,
            dateBlackList: null,

            verification: {
                emailVerifie : this.emailVerifie,
                telephoneVerifie : null,
                cniVerified: false,
                cniVerifiedAt: null,
                isVerified: false,
                isCertified: false,
            },


            score:{
                global: 40,
                badge: "bronze",
            },
            notes: emptyNotes(),
            notation:{
                moyenne: 0,
                nombresAvis : 0,
                completudeProfilPourcentage : this.completudeProfilPourcentage,
            },

            signalements: {
                total : 0,
                historiques: [],
                dernierSignalementAt : null ,
            },
            activite:{
                annoncesActives: 0,
                annnoncesTotal: 0,
                bien: 0,
                batiment: 0,
                bienLibre: 0,
                bienConstruction: 0,
                bienOccuper: 0,
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
            sexe: this.sexe,
            devise : this.devise,
            langue: this.langue,
            createdAt: timestamp.now(),
            updatedAt: timestamp.now(),
            lastConnexion: timestamp.now()
        }
    }

    toFirebase(){
        const bailleur = this.toDataBase()
        return {
            ...bailleur,
            notation: {
                ...bailleur.notation,
                completudeProfilPourcentage: calculerCompletudeBailleur(bailleur).pourcentage
            }
        }
    }
}



module.exports = {Bailleur}
