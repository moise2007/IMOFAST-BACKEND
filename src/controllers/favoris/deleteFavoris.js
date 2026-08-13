const {createId} = require("@paralleldrive/cuid2")
const { db, admin } = require("../../config/firebase")
const { Favori } = require("../../models/favoris")
const {Filter} = admin.firestore

const deleteFavoris = async (req,res)=>{
    try{
        const favoriId = req.params.id

        const locataireId = req.user.idPublic

        // recuperation du favoris
        const favorisRef = await db.collection("favoris").where(
            Filter.and(
                Filter.where("idPublic","==",favoriId),
                Filter.where("locataireId","==",locataireId)
            )
        )
        .limit(1).get()

        if(favorisRef.empty){
            return res.status(402).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }
        //suppression du favoris
        await favorisRef.docs[0].ref.delete()

        return res.status(200).json({
            success: true,
            msg: req.t("success.remove_favori",{ns: "responses"}),
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

module.exports = {deleteFavoris}