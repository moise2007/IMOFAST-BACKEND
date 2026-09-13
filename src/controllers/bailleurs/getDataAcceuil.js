const { annonceCache } = require("../../cache/annonce.cache");
const { bienCache } = require("../../cache/bien.cache");
const { candidatureCache } = require("../../cache/candidature.cache");
const { locatairesCache } = require("../../cache/locataires.cache");
const  { admin, db } = require("../../config/firebase");
const { Users } = require("../../services/auto/usersGetting");
const  { susprendreCompte } = require("../../services/suspensionCompte")
const  { getDocumentsByPublicIds } = require("../../utils/getDocumentsById")
const {Filter} = admin.firestore
const { AggregateField } = require("firebase-admin/firestore");



const getdataAcceuil = async(req,res)=>{
    try{
        const userId = req.user?.idPublic
        const role = req.role 
        let data = {}

        //recuperation des bailleurs
        const locataires  = locatairesCache.cache.values()

        if(!["admin","bailleur"].includes(role)){
            await susprendreCompte(req.user.id,req.role ?? "bailleur",null)
            return res.status(203).json({
                success: false,
                msg: ' votre compte a été suspendus pour 7 jours car nous avons répéré uns activité inhabituelle'
            })
        }

        // RECUPERATION DES ANNONCES
        let annonces = annonceCache.cache.values?.filter(annonce => annonce?.bailleurId == userId)

        // recuperation des biens des annonces
        const biens = bienCache.cache.values?.filter(bien => bien?.bailleurId == userId)

        annonces = annonces.map(ann=>{
            const bien = biens.find(bien => bien?.idPublic == ann?.bienId)
            return {...ann, bien}
        })
        data = {...data, annonces}

        // recuperation du nombre d'annonces total
        const annonceTotal = annonces.length ?? 0

        // recuperation des Annonces Actives
        const annonceActive = annonces?.filter(ann=> ann?.status == "publier")?.length ?? 0

        // recuperation des vues des annonces
        const queryVues = annonces?.map(annonce => annonce?.statistiques?.vues ?? 0)?.reduce((total, vues)=> total + vues, 0) ?? 0

        // recuperation du nombre de demande 
        const demandes = candidatureCache.cache.values?.filter(demande => demande?.bailleurId == userId)
        const demandeTotal = demandes?.length ?? 0

        // recuperation des candidatures non gerer
        const demandesNonGerer = demandes?.filter(demande=> demande?.status == "en_attente")?.length
        
        // recuperation des visites
        const totalVisite = demandes?.filter(demande=> demande?.type == "visite")?.length
        
        // recupration des Annonces Avenir
        const totalVisitePrevu  = demandes?.filter(demande=> demande?.type == "visite" && demande.status == "acceptee")?.length

        

        data = {...data, statistiques: {
            totalAnnonce: annonceTotal,
            totalAnnonceActive: annonceActive,
            vues:vues,
            totalDemande: demandeTotal,
            totalDemandeAttente: demandesNonGerer,
            totalVisite: totalVisite,
            totalVisitePrevu: totalVisitePrevu
        }}

        demandes = demandes.map(demande=>{
            const locataire = locataires.find(locataire => locataire?.idPublic == demande?.locataireId)
            return {...demande, locataire}
        })
        data = {...data, demandes}

        // RECUPERATION DES VISITES

        const visitesSnapsot = await db.collection("candidature")
            .where(Filter.and(
                Filter.where("bailleurId","==",userId),
                Filter.where("type","==","visite")
            ))
            .orderBy("updatedAt","desc")
            .get()
        let visites = visitesSnapsot.docs.map(doc=>doc.data())

        // jointune avec le locataire
        visites = visites.map(visite=>{
            const locataire = locataires.find(locataire => locataire?.idPublic == visite?.locataireId)
            return {...visite, locataire}
        })

        // jointure avec annonce
        const annoncesId = visites.map(visite=>visite?.annonceId)
        const annoncesVisites = await getDocumentsByPublicIds(annoncesId, "annonce")
        const biensId = annoncesVisites.map(ann=>ann?.bienId)
        const biensVisites = await getDocumentsByPublicIds(biensId, "bien")
        visites = visites.map(visite=>{
            const annonce = annoncesVisites?.find(annonce=>annonce?.idPublic == visite?.annonceId)
            const bien = biensVisites?.find(bien=> bien?.idPublic == annonce?.bienId)
            return{...visite,bien,annonce}
        })
        data = {...data,visites}

        //RECUPERATION DES MESSAGES

        const conversationSnapshot = await db.collection("conversation")
            .where("bailleurId","==",userId)
            .orderBy("updatedAt","desc")
            .limit(5)
            .get()
        let conversations =conversationSnapshot.docs.map(doc=>doc.data())
        
        conversations = conversations.map(conv=>{
            const autreUser = locataires.find(loc=>loc?.idPublic == conv?.locataireId)
            return {...conv,autreUser}
        })
        data = {...data,conversations}

        return res.status(200).json({
            success: true,
            data,
            msg: "vos données ont bien chargés"
        })

    }
    catch(err){
        console.log(err)
        return res.status(400).json({
            success: false,
            data,
            msg: "une erreur est survenue."
        })
    }
}

module.exports = {getdataAcceuil}