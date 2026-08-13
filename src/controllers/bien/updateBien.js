const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore
const { formaterObjet } = require("../../services/clearData")


const updateBienBailleur = async(req,res)=>{
     try{
        const idBien = req.params.id
        const {bailleurId,idPublic,vues,...rest} = req.body
        
        const idBailleur = req.user.idPublic
        const dataCleaned = formaterObjet(rest)
        const bienDocs = await db.collection("bien").where(
            Filter.and(
                Filter.where("idPublic","==",idBien),
                Filter.where("bailleurId","==",idBailleur)
            )
        ).limit(1).get()

        if(bienDocs.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        const bienRef = bienDocs.docs[0].ref
        await bienRef.update({...bienDocs.docs[0].data(),...dataCleaned})
        const bien =(await bienRef.get()).data()

        return res.status(200).json({
            success: true,
            bien,
            msg: req.t("success.update_bien",{ns:"responses"})
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
module.exports = {updateBienBailleur}