import { admin } from "../config/firebase";

const timesTamp = admin.firestore.Timestamp

class Video{
    constructor({
        nom,
        prenom,
        duree,
        src,
        thumbail,
        title,
        isAdmin=false
    }){
        this.nom = nom;
        this.prenom = prenom;
        this.duree = duree;
        this.src = src;
        this.thumbail = thumbail;
        this.title = title;
        this.isAdmin = isAdmin;
    }
    toFirebase(){
        return({
            nom: this.nom,
            prenom: this.prenom,
            duree: this.duree,
            src: this.src,
            thumbail : this.thumbail,
            title: this.title,
            isAdmin: this.isAdmin,
            createAt: timesTamp.now(),
            updateAt: timesTamp.now(),
            vues: [],
        })
    }
}