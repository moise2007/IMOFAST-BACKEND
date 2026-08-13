const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore

const deleteCandidature = async(req,res)=>{
    try{
        const  idPublic  = req.params.id
        const auteurId= req.user.idPublic

        // verification si le la condidature Existe
        const candidatureExisteRef = await db.collection("candidature")
        .where(
            Filter.and(
                Filter.where("idPublic","==",idPublic),
                Filter.or(
                    Filter.where("bailleurId","==",auteurId),
                    Filter.where("locataireId","==",auteurId)
                )
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
        const candidatureRef =  candidatureExisteRef.docs[0].ref
        await candidatureRef.update({
            [`delete.${auteurId}`]: true,
            statut: "annuler"
        })


        return res.status(200).json({
            success: true,
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

module.exports = {deleteCandidature}