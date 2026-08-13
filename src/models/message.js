const { admin } = require("../config/firebase")
const timestamp = admin.firestore.Timestamp
class Message {
    constructor({
        conversationId,
        auteurId,
        type,
        contenu,
        medias=null,
        lien=null,
        idPublic,
        repondsA= null
    }) {
        this.conversationId = conversationId
        this.auteurId = auteurId
        this.type = type
        this.contenu = contenu
        this.medias = medias
        this.lien = lien
        this.idPublic = idPublic
        this.repondsA = repondsA

    }

    toFirebase() {
        return {
            //  Référence 
            conversationId: this.conversationId,
            auteurId:this.auteurId,
            idPublic : this.idPublic,

            //  Type 
            type: this.type,
            repondsA: this.repondsA, //icic c'est id du message

            //  Contenu texte 
            contenu: this.contenu ?? "",
            

            //  Médias (image ou vidéo) 
            ...(["image", "video","audio"].includes(this.type) ? {
                medias: {
                    url:       this.medias?.url       ?? null,
                    miniature: this.medias?.miniature ?? null, // pour vidéo
                    taille:    this.medias?.taille    ?? null, // en octets
                    duree: this.medias.duree ?? null
                }
            } : {}),

            //  Lien annonce ou profil 
            ...( ["lien_annonce", "lien_profil"].includes(this.type) ? {
                lien: {
                    idPublic:          this.lien?.idPublic          ?? null,
                    titre:       this.lien?.titre       ?? null,
                    photoProfil:       this.lien?.photoProfil       ?? null,
                    nature: this.lien.nature,
                    localisation: this.lien?.localisation ?? null, // pour bien uniquement
                    prix:        this.lien?.prix        ?? null,   // pour bien uniquement
                }
            } : {}),

            //  Statut 
            lu: false,
            supprime:  false,

            //  Dates 
            createdAt: timestamp.now(),
            expiredAt: timestamp.now(),
        }
    }
}

module.exports = {Message}