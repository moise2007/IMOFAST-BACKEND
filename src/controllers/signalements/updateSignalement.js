const { db, admin } = require("../../config/firebase")
const { formaterObjet } = require("../../services/clearData")
const {Filter} = admin.firestore

const updateSignalement = async(req,res)=>{
    try{
        const auteurId = req.user.idPublic
        const idPublic= req.params.id

        const {raison,description,cibleId } = req.body
        const datacleaned = formaterObjet({raison,description})
        const data = {auteurId,cibleId}
        if(datacleaned?.raison){
            data.raison = datacleaned?.raison
        }
        if(datacleaned?.description){
            data.description = datacleaned?.description
        }
        
        const signalementRef = await db.collection("signalement").where(
            Filter.and(
                Filter.where("idPublic","==",idPublic),
                Filter.where("cibleId","==",cibleId),
                Filter.where("auteurId","==",auteurId)
            )
        ).limit(1).get()

        if(signalementRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        //modification de l'element
        await signalementRef.docs[0].ref.update(data)

        return res.status(200).json({
            sucesss: false,
            msg: req.t("success.update_signalement" , {ns:"responses"})
        })
    
    }    
     catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error",{ns: "errors"})
        })
    }
}

module.exports = {updateSignalement}
