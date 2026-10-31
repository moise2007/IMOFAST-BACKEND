const { admin } = require("../config/firebase")
const { genenrateId } = require("../utils/generateId")
const TimeStamp = admin.firestore.Timestamp

const now = TimeStamp.now()

export class Session{
    constructor({id, role,device, isAnonyme, enterPage, campagne, source, os, browers, language, theme, pays, ville, quartier, lon, lat}){
        this.id = isAnonyme ? "visiteur" : id
        this.idAnonyme = genenrateId(null, true)
        this.role = isAnonyme ? null : role
        this.device = device
        this.enterPage = enterPage
        this.campagne = campagne
        this.source = source
        this.os = os
        this.browers = browers
        this.language = language
        this.theme = theme
        this.pays = pays
        this.ville = ville
        this.quartier = quartier
        this.lon = lon
        this.lat = lat
    }

    toFireBase(){
        
        return{
            // @identifation
            idPublic : genenrateId("session"),
            user: this.id,
            role: this.role,

            // @ caracterisque de l'appariel
            devise: this.device,
            os: this.os,
            browers: this.browers ?? "aucun",
            language: this.language ?? "aucune",
            theme: this.theme ?? "systeme",


            localisation: {
                ville: this.ville,
                quartier: this.quatier ?? null,
                lon: this.lon ?? null,
                lat: this.lat ?? null,
                pays: this.pays ?? "cameroun"
            },

            // @ page
            enterPage: this.enterPage,
            exitPage: null,

            // @ lastEvent
            idLastEvent: null,

            // @origin
            campagne : this.campagne ?? "aucune",
            source: this.source ?? "aucune",



            // @ date
            createdAt: now,
            startedAt: now,
            endedAt: null,
            updatedAt: now,
            deletedAt: null,
            duration: 10 ,
            isDelete: false,
        }
    }
}

class Event{
    constructor(id,idAnonyme){
        this.id = id
        this.idAnonyme = idAnonyme
    }

    toFireBasse(){
        return{
            idAnonyme: this.idAnonyme,
            userId : this.id,
            
            
            // @ date
            createdAt: now,
            startedAt: now,
            endedAt: null,
            updatedAt: now,
            deletedAt: null,
            duration: 10 ,
            isDelete: false,
        }
    }
}

export class EventVisitAnnonce extends Event{
    constructor({id, idAnonyme, annonceId}){
        super(id,idAnonyme)
        this.annonceId = annonceId
    }

    toFireBasse(){
        return{
            ...super.toFireBasse(),
            annonceId: this.annonceId
            
        }
    }
}
