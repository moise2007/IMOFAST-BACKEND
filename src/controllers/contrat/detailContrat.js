const { db, admin } = require("../../config/firebase")
const {Filter}= admin.firestore

const getDetailContrat = async(req,res)=>{
    try{
        const idPublic =req.params.id
        const bailleurId = req.user.idPublic

        //verification si le contract existe
        const contratRef = await db.collection("locataire")
        .where(Filter.and(
            Filter.where("idPublic","==",idPublic),
            Filter.where("bailleurId","==",bailleurId)
        ))
        .limit(1)
        .get()

        if(contratRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("error.contract_not_found", { ns: "responses" })
            })
        }

        // recuperation du contract
        const contrat = contratRef.docs[0].data()

        return res.status(200).json({
            success: true,
            contrat,
            msg : req.t("success.load_one_contract", { ns: "responses" })
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
module.exports = {getDetailContrat}