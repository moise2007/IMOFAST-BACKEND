const { db, admin } = require("../../config/firebase")
const { formaterObjet } = require("../../services/clearData")
const {Filter} = admin.firestore


const deleteSignalement = async(req,res)=>{
    try{
        //recuperation des donnees necessaires
        const auteurId = req.user.idPublic
        const idPublic= req.params.id
        const {cibleId } = req.body

        //recuperation du signalement dans la base de donnees
        
        const signalementRef = await db.collection("signalement").where(
            Filter.and(
                Filter.where("idPublic","==",idPublic),
                Filter.where("cibleId","==",cibleId),
                Filter.where("auteurId","==",auteurId)
            )
        ).limit(1).get()

        //verification si le signalement existe
        if(signalementRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        // suppression du signalement 
        await signalementRef.docs[0].ref.delete()

        return res.status(200).json({
            sucesss: true,
            msg: req.t("success.delete_signalement",{ns: "responses"})
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

module.exports = {deleteSignalement}
