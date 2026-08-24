const { createId } = require("@paralleldrive/cuid2");
const express = require("express");
const { sessionMiddleware } = require("../middlewares/sessionAnaliticsMiddleware");
const { db, admin } = require("../config/firebase");
const { collection } = require("firebase/firestore");



const pageTitles = {
    // =========================
    // GÉNÉRAL / VISITEUR
    // =========================
    "/": "Accueil",
    "/acceuil": "Accueil",
    "/contact": "Contact",
    "/a-propos": "À propos",
    "/blog": "Blog",
    "/blog/*": "Article du blog",
    "/annonces": "Annonces immobilières",
    "/annonce/*": "Détail de l'annonce",
    "/aide&support": "Aide et support",
    "/signalerArnaques": "Signaler une arnaque",
    "/ask-register": "Inscription",

    // =========================
    // AUTHENTIFICATION
    // =========================
    "/auth/inscription": "Inscription",
    "/auth/connexion": "Connexion",
    "/auth/connexion/bailleur": "Connexion bailleur",
    "/auth/connexion/locataire": "Connexion locataire",

    // =========================
    // LOCATAIRE
    // =========================
    "/locataire": "Nouveautés",
    "/locataire/nouveautes": "Nouveautés",
    "/locataire/videos": "Vidéos",
    "/locataire/alertes": "Mes alertes",
    "/locataire/alertes/details/*": "Détail de l'alerte",

    "/locataire/annonces": "Annonces",
    "/locataire/annonce/*": "Détail de l'annonce",

    "/locataire/favoris": "Mes favoris",

    "/locataire/candidatures": "Mes candidatures",
    "/locataire/candidatures/details/*": "Détail de la candidature",

    "/locataire/notifications": "Notifications",
    "/locataire/parametres": "Paramètres",

    "/locataire/messagerie": "Messagerie",
    "/locataire/messagerie/*": "Conversation",

    "/locataire/service-client": "Service client",
    "/locataire/abonnement": "Abonnement",

    // =========================
    // BAILLEUR
    // =========================
    "/bailleur": "Tableau de bord",
    "/bailleur/acceuil": "Tableau de bord",

    "/bailleur/mesAnnonces": "Mes annonces",
    "/bailleur/mesAnnonces/create": "Créer une annonce",
    "/bailleur/mesAnnonces/view/*": "Détail de l'annonce",
    "/bailleur/mesAnnonces/update/*": "Modifier une annonce",

    "/bailleur/mesBiens": "Mes biens",
    "/bailleur/mesBiens/createBien": "Ajouter un bien",
    "/bailleur/mesBiens/details/*": "Détail du bien",
    "/bailleur/mesBiens/modifier/*": "Modifier le bien",

    "/bailleur/candidatures": "Candidatures",
    "/bailleur/candidatures/details/*": "Détail de la candidature",

    "/bailleur/messagerie": "Messagerie",
    "/bailleur/messagerie/*": "Conversation",

    "/bailleur/agenda": "Agenda",
    "/bailleur/parametres": "Paramètres",
    "/bailleur/statistiques": "Statistiques",
    "/bailleur/abonnement": "Abonnement",
    "/bailleur/service-client": "Service client",

    // =========================
    // PAGES PARTAGÉES
    // =========================
    "/cookies": "Cookies",
    "/conditions-utilisation": "Conditions d'utilisation",
    "/confidentialite": "Politique de confidentialité"
};
async function getLocationFromIP(ip) {
    try {

        const response = await fetch(
            `https://ipapi.co/${ip}/json/`
        );

        if (!response.ok) {
            throw new Error(
                `Erreur API localisation: ${response.status}`
            );
        }

        const data = await response.json();

        return {
            country: data.country_name ?? null,
            countryCode: data.country_code ?? null,

            region: data.region ?? null,
            regionCode: data.region_code ?? null,

            city: data.city ?? null,

            postalCode: data.postal ?? null,

            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,

            timezone: data.timezone ?? null
        };

    } catch (error) {

        return {
            country: null,
            countryCode: null,
            region: null,
            regionCode: null,
            city: null,
            postalCode: null,
            latitude: null,
            longitude: null,
            timezone: null
        };
    }
}

const routerAnalitic = express.Router()

class Analitic{
    constructor({role,id,userId,page,annonceId,operatingSystem,screen,device,inscrit,theme,browser,userAgent,location,language}){
        this.role= role ?? "visiteur",
        this.anonymousId= id ?? `Annm_${createId()}`
        this.userId= userId ?? null,

        this.startedAt = new Date().toISOString()
        this.duration = 10,
        this.exitPage = [page] ?? [],
        this.annoncesVisiter = annonceId
        ? [{
            annonceId,
            duration:10,
            visitedAt: new Date().toISOString()
        }]
        : []
        this.events = [],
        this.screen = screen ?? {
            width: null,
            height: null,
            pixelRatio: null
        }
        this.location = location ?? {
            country: null,
            region: null,
            city: null,
            latitude: null,
            longitude: null
        };
        this.pages = page
        ? [{path: page,title: pageTitles[page],enteredAt: new Date().toISOString(),exitedAt: null,duration: 10}]
        :[]
        this.userAgent = userAgent ?? null
        this.language = language ?? {primary: null, preferences:null}
        this.theme = theme ?? null
        this.browser = browser ?? {
            name: null
        }
        this.operatingSystem = operatingSystem ??{
            name: null
        }
        this.device = device ?? {
            type: null,
            vendor: null,
            model: null,
            screen: null
        }
        this.statistics = {
            pagesVisited: 1,
            annoncesVisited: annonceId? 1 : 0,
            eventsCount: 0,
            inscrit: inscrit ?? false,
        }
        this.createdAt =  new Date().toISOString()
        this.updatedAt = new Date().toISOString()
    }
    toJSON() {
        return {
            role: this.role,
            anonymousId: this.anonymousId,
            userId: this.userId,
            startedAt: this.startedAt,
            duration: this.duration,
            exitPage: this.exitPage,
            annoncesVisiter: this.annoncesVisiter,
            events: this.events,
            screen: this.screen,
            location: this.location,
            pages: this.pages,
            userAgent: this.userAgent,
            language: this.language,
            theme: this.theme,
            browser: this.browser,
            operatingSystem: this.operatingSystem,
            device: this.device,
            statistics: this.statistics,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

routerAnalitic.post("/initialize",sessionMiddleware,async(req,res)=>{
    try{
        const location = await getLocationFromIP(req.ip)
        const data = req.body
        if(!req.exist){
            const analitic = new Analitic({
                role: req?.role,
                userId: req?.userId,
                inscrit: req?.inscrit,
                screen: data?.screen,
                id: req?.anonimousId,
                page: (data?.page?.path == "" ? "/":data?.page?.path) ?? "/",
                language: data?.language ?? "unknow",
                theme: data?.theme ?? "light",
                browser: data?.browser,
                operatingSystem: data?.operatingSystem,
                device: data?.device,
                userAgent: data?.userAgent,
                location,
                annonceId: data?.annonceId ?? null
            })
            const user = analitic.toJSON()
            await db.collection("analitic").doc(analitic.anonymousId).set(user)
        }
        else{
            await db.collection("analitic").doc(req?.anonymousId).update({
                pages: admin.firestore.FieldValue.arrayUnion({
                    path: page,title: pageTitles[page],enteredAt: new Date().toISOString(),exitedAt: null,duration: 10
                })
            })
        }
        return res.status(200).json({
            success: true,
            msg: "good save"
        })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: "bad saving"
        })
    }
    
})

module.exports = {routerAnalitic,Analitic}