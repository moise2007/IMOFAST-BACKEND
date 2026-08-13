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

        //recuperation des Locataires 
        const locataires = Users?.COMPTE_CACHE?.locataire

        if(!["admin","bailleur"].includes(role)){
            await susprendreCompte(req.user.id,req.role ?? "bailleur",field)
            return res.status(203).json({
                success: false,
                msg: ' votre compte a été suspendus pour 7 jours car nous avons répéré uns activité inhabituelle'
            })
        }

        // RECUPERATION DES ANNONCES

        const AnnoncesSnapshot = await db.collection("annonce")
            .where("bailleurId","==",userId)
            .limit(5)
            .get()


        let annonces = AnnoncesSnapshot.docs.map(doc=>doc.data())

        // recuperation des biens des annonces
        const idBiens = annonces.map(ann=>ann.bienId).filter(Boolean)
        const biens = await getDocumentsByPublicIds(idBiens, "bien")

        annonces = annonces.map(ann=>{
            const bien = biens.find(bien => bien?.idPublic == ann?.bienId)
            return {...ann, bien}
        })
        data = {...data, annonces}

        // recuperation du nombre d'annonces total
        const annonceTotal = (await db.collection("annonce")
            .where("bailleurId","==",userId).count().get()).data().count

        // recuperation des Annonces Actives
        const annonceActive = (await db.collection("annonce")
            .where(Filter.and(
                Filter.where("bailleurId","==",userId),
                Filter.where("status","==","publier")
            ))
            .count().get()).data().count

        // recuperation des vues des annonces
        const queryVues = db.collection("annonce")
            .where("bailleurId","==",userId)
        
        const snapshotVues = await queryVues.aggregate({
            totalVues: AggregateField.sum("statistiques.vues")
        }).get()
        const vues = snapshotVues.data()?.totalVues ?? 0

        // recuperation du nombre de demande 
        const demandeTotal = (await db.collection("candidature")
            .where("bailleurId","==",userId).count().get()).data().count

        // recuperation des candidatures non gerer
        const demandesNonGerer = (await db.collection("candidature")
            .where(Filter.and(
                Filter.where("bailleurId","==",userId),
                Filter.where("status","==","en_attente")
            ))
            .count().get()).data().count
        
        // recuperation des visites
        const totalVisite = (await db.collection("candidature")
            .where(Filter.and(
                Filter.where("bailleurId","==",userId),
                Filter.where("type","==","visite")
            ))
            .count().get()).data().count
        
        // recupration des Annonces Avenir
        const totalVisitePrevu  = (await db.collection("candidature")
            .where(Filter.and(
                Filter.where("bailleurId","==",userId),
                Filter.where("type","==","visite"),
                Filter.where("status","==","acceptee")
            ))
            .count().get()).data().count

        

        data = {...data, statistiques: {
            totalAnnonce: annonceTotal,
            totalAnnonceActive: annonceActive,
            vues:vues,
            totalDemande: demandeTotal,
            totalDemandeAttente: demandesNonGerer,
            totalVisite: totalVisite,
            totalVisitePrevu: totalVisitePrevu
        }}
        // RECUPERATION DES DEMANDES
        const demandesSnapshot = await db.collection("candidature")
        .where("bailleurId","==",userId)
        .orderBy("createdAt","desc")
        .limit(3)
        .get()
        let demandes = demandesSnapshot.docs.map(doc=>doc.data())
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