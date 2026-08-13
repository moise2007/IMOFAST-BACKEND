const { db, admin } = require("../../config/firebase")
const { createNotification } = require("../notifications/createNotification")
const {Filter} = admin.firestore

const programmerCandidature = async(req,res)=>{
    try{
        const  idPublic  = req.params.id
        const bailleurId= req.user.idPublic
        const {date,time} =req.body

        console.log(date,time)
        // verification si le la condidature Existe
        const candidatureExisteRef = await db.collection("candidature")
        .where(
            Filter.and(
                Filter.where("type","==","visite"),
                Filter.where("idPublic","==",idPublic),
                Filter.where("statut", "in",["en_attente","visitePrevue"]),
                Filter.where("bailleurId","==",bailleurId)
            )
        )
        .limit(1)
        .get()

        if(candidatureExisteRef.empty){
            return res.status(404).json({
                success: false,
                msg : req.t("error.candidature_not_found",{ns: "responses"})
            })
        }

        // modification de la candidature
        const candidatureRef = await candidatureExisteRef.docs[0].ref
        await candidatureRef.update({
            updateAt: new Date(),
            statut: "visitePrevue",
            "visite.dateSouhaitee": date,
            "visite.heureSouhaitee": time
        })
        const candidature = (await candidatureRef.get()).data()

        return res.status(200).json({
            success: true,
            candidature,
            msg : req.t("success.delete_candidature",{ns:"responses"})
        })
    }
    catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }

}

module.exports = {programmerCandidature}