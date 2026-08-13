const { admin, db } = require("../../../config/firebase")

const {Filter} =admin.firestore

const updateStatutBailleur = async(req,res)=>{
    try{
        const annonceId = req.params.id
        const bailleurId = req.user.idPublic
        const {status} = req.body

        const bienDocs = await db.collection("annonce").where(
            Filter.and(
                Filter.where("idPublic","==",annonceId),
                Filter.where("bailleurId","==",bailleurId)
            )
        ).limit(1).get()

        if(bienDocs.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        const bienRef = bienDocs.docs[0].ref.update({status})
        return res.status(200).json({
            
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
module.exports = {updateStatutBailleur}