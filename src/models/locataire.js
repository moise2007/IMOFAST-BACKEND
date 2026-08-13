const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
const {createId} = require("@paralleldrive/cuid2")
class Locataire {
  constructor({
    nom,
    prenom=null,
    dateNaissance=null,
    preferences=null,
    email=null,
    password=null,
    telephone=null,
    uidGoogle=null,
    pieceIdentite=null,
    photoProfil= "",
    emailVerifie =false,
    telephoneVerifie = false,
    completudeProfilPourcentage,
    sexe,
    langue=null,
    devise=null,
    idConversationAdmin,
  }) {
    this.nom = nom ?? "";
    this.prenom = prenom ?? "";
    this.sexe = sexe ?? null
    this.devise = devise;
    this.langue = langue;
    this.photoProfil = photoProfil;
    this.dateNaissance = dateNaissance ?? "";
    this.preferences = {
      typeLogement: preferences?.types ?? "all",
      maxBudget : preferences?.maxBudget ?? 150000,
      quartier: preferences?.quartier ?? "all"
    };
    this.email = email ?? "";
    this.password = password
    this.telephone = telephone ?? "";
    this.uidGoogle = uidGoogle ?? null;
    this.pieceIdentite = pieceIdentite ?? [];
    this.emailverifie = emailVerifie;
    this.telephoneVerifie = telephoneVerifie
    this.completudeProfilPourcentage = completudeProfilPourcentage;
    this.idConversationAdmin = idConversationAdmin
  }

  toFirebase() {
    return {
      nom: this.nom,
      prenom: this.prenom,
      dateNaissance: this.dateNaissance,
      photoProfil: this.photoProfil,
      preferences: this.preferences,
      email: this.email,
      telephone: this.telephone,
      idPublic: createId(),
      uidGoogle: this.uidGoogle,
      pieceIdentite: null,
      password : this.password,
      verification: {
        emailVerifie: this.emailverifie,
        telephoneVerifie: this.telephoneVerifie,
      },
      

      // données système
      bailleur: null,
      idConversationAdmin: this.idConversationAdmin,
      statut: null,
      sexe: null,
      finSuspension: null,
      status:"actif", // suspendus ou blacklister

      //scoring et repuattion
      scoreGolbal: null,
      scoreStatus: null,

      // notation Avis
      notation:{
        moyenne: null,
        nombreAvis: null,
        completudeProfilPourcentage: this.completudeProfilPourcentage,
      },
      role: "locataire",
      signalement:{
        total: null,
        dernierSignalementAt: null,
      },
      forfait: {
        debut: null,
        type: "aucun", //"annuel","trimestriel","annuel"
        fin: null,
      },
      nombreAlertesRestants: 1,
      candidatures: {
        candidaturesRestantes: 5,
        idCandidatures: []
      },
      visitesVirtuelles:{
        visitesRestantes: 1,
        idVisites:[]
      },
      devise: this.devise ??  "XAF",
      langue: this.langue?? "fr",
      createdAt: timestamp.now(),
      updatedAt: timestamp.now(),
      lastConnexion: timestamp.now()
    };
  }
}

module.exports = {Locataire}