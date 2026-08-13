
const {createId}=require("@paralleldrive/cuid2")
const { admin, db } = require("../../config/firebase")
const { susprendreCompte } = require("../../services/suspensionCompte")

const timestamp=admin.firestore.Timestamp



function verifie({type,nature,ville,prix,natureAnnonce}){
    const errors = []
    if(!type || !["appartement","villa","duplex","studio","chambre"].includes(type)){
        errors.push("type")
    }
    if(!nature || !["moderne","simple","meubler"].includes(nature)){
        errors.push("nature")
    }
    if(!ville || ville.length < 3){
        errors.push("ville")
    }
    if( !prix ||prix.length < 4){
        errors.push("prix")
    }
    if(!natureAnnonce || !["vente","location"].includes(natureAnnonce)){
        errors.push("nature de l'annonce(vente ou location)")
    }
    if(errors.length == 0){
        return {success: true, message: null}
    }
    
    return {
        success: false,
        message: `veuillez specifier: ${errors.join(", ")}`
    }
}


const createAlerte = async(req,res)=>{
    try{
        const {type,natureAnnonce,nature,ville,quartier,prix,frequence,duree,caution,nombreChambre,nombreDouche,equipements,securite}=req.body
        const auteurId=req.user.idPublic
        const forfait=req.user.forfait.type

        if(!["mensuel","trimestriel","annuel","aucun"].includes(req.user.forfait.type)){
            const field = {"forfait.type": "aucun"}
            await susprendreCompte(req.user.id,req.role ?? "locataire",field)
            return res.status(203).json({
                success: false,
                msg: ' votre compte a été suspendus pour 7 jours car nous avons répéré uns activité inhabituelle'
            })
        }

        if(
            !["mensuel","trimestriel","annuel","aucun"].includes(req.user.forfait.type) || 
            (req.user.forfait.type =="aucun"  || 
            new Date() > new Date(req.user.forfaite?.fin?._seconds*1000)) && 
            (req.user.nombreAlertesRestants <= 0 && req.user.nombreAlertesRestants!= null)
        ){
            return res.status(200).json({
                success: false,
                candidature:null,
                forfait: true,
                msg : "veuillez souscrire à un forfait pour pouvoir faire des alertes aux bailleurs."
            })
        }

        const valid = verifie({type,nature,ville,prix,natureAnnonce})
        if(!valid.success){
            return res.status(200).json(
                {
                    success:false,
                    message: valid?.message ?? "erreur serveur."
                })
        }


        let queryBien=db.collection("bien")

        if(type)queryBien=queryBien.where("type","==",type)
        if(nature)queryBien=queryBien.where("nature","==",nature)
        if(ville)queryBien=queryBien.where("motCles","array-contains",ville.toLowerCase())

        if(quartier){
            const q=quartier.toLowerCase()
            queryBien=queryBien.orderBy("localisation.quatier").startAt(q).endAt(q+"\uf8ff")
        }

        const biensSnapshot=await queryBien.limit(30).get()
        const bienIds=biensSnapshot.docs.map(doc=>doc.data().idPublic)

        let annonces=[]

        if(bienIds.length){
            let queryAnnonce=db.collection("annonce").where("bienId","in",bienIds)
            if(prix)queryAnnonce=queryAnnonce.where("recherche.minPrix","<=",prix)
            queryAnnonce = queryAnnonce
                .where("status","!=","suspendus")
                .orderBy("createdAt", "desc")
                .orderBy("statistiques.vues","desc")
                .orderBy("metaData.note","desc")
            const annoncesSnapshot=await queryAnnonce.limit(5).get()
            annonces=annoncesSnapshot.docs.map(doc=>doc.data())
        }
        else{
            return res.status(200).json({success:false,reste:0,message:"nous n'avons pas trouver de logement corrrespondant à vos critères."})
        }

        const alerte={
            idPublic:createId(),
            type,
            natureAnnonce,
            nature,
            ville,
            quartier,
            prix,
            frequence,
            duree,
            caution,
            nombreChambre,
            nombreDouche,
            equipements,
            securite,
            auteurId,
            role:req.role,
            annoncesId:annonces.map(a=>a.idPublic),
            bailleurId :annonces.map(a=>a.bailleurId),
            createdAt:timestamp.now(),
            updatedAt:timestamp.now()
        }

        await db.collection("alerte").add(alerte)
        if (req.user.forfait.type =="aucun"  ||  new Date() > new Date(req.user.forfaite?.fin?._seconds*1000)){
            await db.collection('locataire').doc(req.user.id).update({
                nombreAlertesRestants: admin.firestore.FieldValue.increment(-1)
            })
        }
        await db.collection("recherhce").add(alerte)

        return res.status(200).json({
            success:true,
            hasAlerte: true,
            reste: true,
            alerte,
            message: `votre alerte a été publié avec succès, maintenant les bailleurs intèressés vos contactera via la messagerie`
        })

    }catch(err){
        console.log(err.message)
        return res.status(500).json({success:false,alerte:null})
    }
}

module.exports = {createAlerte}