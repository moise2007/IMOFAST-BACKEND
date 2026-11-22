const { admin } = require("../config/firebase")
const { emptyNotes } = require("../utils/notesDistribution")
const timestamp = admin.firestore.Timestamp
const { createId } = require("@paralleldrive/cuid2");
const { calculerCompletudeProfil } = require("../utils/completudeProfil/completudeProfil.locataire.utils");
class Locataire {
  constructor({
    nom,
    prenom = null,
    dateNaissance = null,
    preferences = null,
    email = null,
    password = null,
    telephone = null,
    uidGoogle = null,
    photoProfil = "",
    emailVerifie = false,
    telephoneVerifie = false,
    completudeProfilPourcentage,
    langue = null,
    devise = null,
    idConversationAdmin,
  }) {
    this.nom = nom ?? null;
    this.prenom = prenom ?? null;
    this.devise = devise;
    this.langue = langue;
    this.photoProfil = photoProfil;
    this.dateNaissance = dateNaissance ?? null;
    this.preferences = {
      typeLogement: preferences?.types ?? "all",
      maxBudget: preferences?.maxBudget ?? 150000,
      quartier: preferences?.quartier ?? "all"
    };
    this.email = email ?? "";
    this.password = password
    this.telephone = telephone ?? null;
    this.uidGoogle = uidGoogle ?? null;
    this.emailverifie = emailVerifie;
    this.telephoneVerifie = telephoneVerifie
    this.completudeProfilPourcentage = completudeProfilPourcentage;
    this.idConversationAdmin = idConversationAdmin
  }

  toDataBase() {
    return {
      role: "locataire",
      notification: { web: null, mobile: null },
      notifications: [],
      activiteInterne: { commentaires: 0, reponses: 0, notes: 0, conversationsCreees: 0, messagesEnvoyes: 0 },
      notificationPreferences: { ...require("../utils/notificationPreferences").DEFAULT_NOTIFICATION_PREFERENCES },
      notificationsActivees: true,
      nom: this.nom,
      prenom: this.prenom,
      dateNaissance: this.dateNaissance,
      photoProfil: this.photoProfil,
      preferences: {
        typeBien: "logement",
        ...this.preferences,
      },

      localisation: {
        ville: null,
        pays: "cameroun",
        adresse: this.adresse,
        quatier: null,
        lon: null,
        lat: null
      },
      email: this.email,
      telephone: this.telephone,
      idPublic: createId(),
      uidGoogle: this.uidGoogle,
      cni: {
        imageRecto: null,
        imageVerso: null
      },
      password: this.password,
      verification: {
        emailVerifie: this.emailverifie,
        telephoneVerifie: false,
        cniVerified: false,
        cniVerifiedAt: null,
        isVerified: false,
        isCertified: false,
      },


      // données système
      bailleur: null,
      idConversationAdmin: this.idConversationAdmin,
      sexe: null,
      metier: null,
      finSuspension: null,
      status: "actif", // suspendus ou blacklister

      //scoring et repuattion
      scoreGolbal: null,
      scoreStatus: null,

      // notation Avis
      notation: {
        moyenne: 0,
        nombreAvis: 0,
        completudeProfilPourcentage: this.completudeProfilPourcentage,
      },

      notes: emptyNotes(),
      role: "locataire",
      signalement: {
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
      visitesVirtuelles: {
        visitesRestantes: 1,
        idVisites: []
      },
      devise: this.devise ?? "XAF",
      langue: this.langue ?? "fr",
      createdAt: timestamp.now(),
      updatedAt: timestamp.now(),
      lastConnexion: timestamp.now()
    };
  }
  toFirebase() {
    const locataire = this.toDataBase()
    return {
      ...locataire,
      notation: {
        ...locataire.notation,
        completudeProfilPourcentage: calculerCompletudeProfil(locataire).pourcentage
      }
    }
  }
}

module.exports = { Locataire }
