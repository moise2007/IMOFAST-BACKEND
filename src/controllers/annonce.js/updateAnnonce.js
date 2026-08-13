const { admin, db } = require("../../config/firebase")
const { formaterObjet } = require("../../services/clearData")
const {Filter} = admin.firestore


const updateAnnonceBailleur = async(req,res)=>{
    try{
        const {bailleurId,bienId,idPublic,...data} = req.body
        const annonceId = req.params.id
        const datacleaned = formaterObjet(data)

        const idbail = req.user.idPublic

        const annoncesDocs = await db.collection("annonce").where(
            Filter.and(
                Filter.where("idPublic","==",annonceId),
                Filter.where("bailleurId","==",idbail)
            )
        ).limit(1).get()

        if(annoncesDocs.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        const {loyer,titre,description,devise,dateExpiration} = datacleaned
        const annonceRef = annoncesDocs.docs[0].ref
        await annonceRef.update({loyer,titre,description,devise,dateExpiration})
        const annonce = (await annonceRef.get()).data()
        return res.status(200).json({
            success: true,
            annonce,
            msg: req.t("success.update_annonce",{ns: "responses"})
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
module.exports = {updateAnnonceBailleur}