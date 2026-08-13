const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore
/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */
const getDataLocataire = async(req,res)=>{
    if(req.user.status == "actif" && !req.user.finSuspension){
        // recuperation des candidatures
        const candidaturesSnapShot = await db.collection("candidature")
        .where(Filter.and(
            Filter.where("locataireId","==",req.user?.idPublic),
            Filter.where("statut","==","en_attente")
        ))
        .select("annonceId","type","idPublic")
        .get()

        const candidaturesId = candidaturesSnapShot.docs.map(doc=>doc.data())
        return res.status(200).json({
            success: true,
            user: {...req.user,candidaturesId},
            msg: "requette efectue avec success"
        })
    }
    else{
        if(new Date(req.user.finSuspension?._seconds*1000) < new Date){
            await db.collection(req.role).doc(req.user.id).update({
                "status": "actif",
                "finSuspension": null
            })

            // recuperation des candidatures
            const candidaturesSnapShot = await db.collection("candidatures")
            .where("aauteurId","==",req.user?.idPublic)
            .select("idPublic","type")
            .get()

            const candidaturesId = candidaturesSnapShot.docs.map(doc=>doc.data())
            
            return res.status(200).json({
                success: true,
                user: {...req.user,candidaturesId},
                msg: "requette efectue avec success"
            })
        }
        else{
            return res.status(203).json({
                success: true,
                suspendu: true,
                user: null,
                msg: `votre compte à été suspendu jusqu'au : ${new Date(req.user.finSuspension?._seconds*1000).toLocaleDateString("fr-FR",{
                    month:"short",
                    year: "numeric",
                    day: "2-digit"
                })}`
            })
        }
    }
    
}
module.exports = { getDataLocataire}