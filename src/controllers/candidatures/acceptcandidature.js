const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore

const acceptCandidature = async(req,res)=>{
    try{
        const  idPublic  = req.params.id
        const bailleurId= req.user.idPublic

        // verification si le la condidature Existe
        const candidatureExisteRef = await db.collection("candidature")
        .where(
            Filter.and(
                Filter.where("idPublic","==",idPublic),
                Filter.where("statut", "==","en_attente"),
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
        const candidature  = candidatureExisteRef.docs[0].data()
        const candidatureRef = await candidatureExisteRef.docs[0].ref
        await candidatureRef.update({
            updateAt: new Date(),
            statut: candidature.type == "demande" ? "dossierRetenu" : "visitePrevue"
        })
        return res.status(200).json({
            success: true,
            candidature,
            msg : req.t("success.candidature_created",{ns:"responses"}),
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

module.exports = {acceptCandidature}