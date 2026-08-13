const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore


const getSignalement = async(req,res)=>{

    let {signalementId,raison,typeCible,cibleId,auteurId} = req.query
    
    if(auteurId){
        if(req.role =="locataire"){
            auteurId = req.user.idPublic
        }
        if(req.role == "bailleur"){
            auteurId = req.user.idPublic
        }
    }

    const query = await db.collection("signalement")

    if(signalementId) 
        query = query.where("idPublic","==",signalementId)
    if(raison)
        query = query.where("raison","==",raison)
    if(typeCible)
        query = query.where("typeCible","==",typeCible)
    if(cibleId)
        query = query.where("cibleId","==",cibleId)
    if(auteurId)
        query = query.where("auteurId","==",auteurId)

    const signalementRef =  await query.limit(30).get()

    if(signalementRef.empty){
        return res.status(404).json({
            success: true,
            signalements: [],
            total: 0,
            msg: req.t("not_found",{ns: "errors"})
        })
    }
    const signalements = signalementRef.docs.map(signalement => signalement.data())
    return res.status(200).json({
        success: true,
        signalements,
        total: signalements.length,
        msg: req.t("success.get_signalement",{ns: "responses"})

    })
}
module.exports = {getSignalement}