const { db } = require("../../config/firebase")
const { getDocumentsByPublicIds } = require("../../utils/getDocumentsById")

async function joindreBienEtBailleur(annonces, role) {
    const idPublisBien = annonces.map((a) => a?.bienId).filter(Boolean)
    const biens = await getDocumentsByPublicIds(idPublisBien, "bien")

    let result = annonces.map((ann) => ({
        ...ann,
        bien: biens.find((b) => b.idPublic === ann.bienId),
    }))

    if (role !== "bailleur") {
        const idPublicsBailleur = result.map((a) => a?.bailleurId).filter(Boolean)
        const bailleurs = await getDocumentsByPublicIds(idPublicsBailleur, "bailleur")
        result = result.map((ann) => ({
            ...ann,
            bailleur: bailleurs.find((b) => b.idPublic === ann.bailleurId),
        }))
    }
    return result
}


const getDetailAlerte = async(req,res)=>{
    try{
        const role = req.role
        const auteurId = req.user?.idPublic
        const {id} = req.params

        // recupearion de l'aterte
        let queryAlerte = db.collection("alerte").where("idPublic","==",id)
        if(role == "bailleur"){
            queryAlerte = queryAlerte.where("bailleurId",'array-contains',auteurId)
        }
        if(role == "locataire"){
            queryAlerte = queryAlerte.where("auteurId","==",auteurId)
        }
        const  alerteSnapshot = await  queryAlerte.limit(1).get()

        if(alerteSnapshot.empty){
            return res.status(404).json({
                success: true,
                alertes: null,
                msg: " cet alertes n'existe pas."
            })
        }

        let alerte = alerteSnapshot.docs[0].data()

        // recuperation du baileur et de l'annonce  et du bien
        if(role == "locataire"){
            // recuperation de l'annonce
            const annoncesSnapshot = await db.collection("annonce")
            .where("idPublic","in",alerte?.annoncesId).get()

            if(annoncesSnapshot.empty){
                return res.status(404).json({
                    success: true,
                    alertes: null,
                    msg: " cet alertes n'existe pas."
                })
            }
            let annonces = annoncesSnapshot.docs.map(ann=>ann.data())

            // recupearion du bien
            const idPublisBien = annonces.map((a) => a?.bienId).filter(Boolean)
            const biens = await getDocumentsByPublicIds(idPublisBien, "bien")

            annonces = annonces.map((ann) => ({
                ...ann,
                bien: biens.find((b) => b.idPublic === ann.bienId),
            }))
            alerte ={...alerte, annonces}
            
            return res.status(200).json({
                success: true,
                alerte,
                msg: "l'alerte a chargé correctement."
            })
        }
        
            
        return res.status(404).json({
            success: true,
            alerte: null,
            msg: " les alertes ont charges avec succèss."
        })
        
        
    }
    catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            alerte: null,
            msg: "une erreur inconnu est survenue."
        })
    }
    
}


module.exports = {getDetailAlerte}