const { db, admin } = require("../../config/firebase")
const { createNotification } = require("../notifications/createNotification")
const Timestamp = admin.firestore.Timestamp
const {Filter} = admin.firestore

const updateCandidature = async(req,res)=>{
    try{
        const  idPublic  = req.params.id
        const {demande,visite} = req.body
        const locataireId= req.user.idPublic

        if(!(demande && visite)){
            return res.status(409).json({
                success: false,
                msg : req.t("not_found_candidature_element",{ns: "errors"})
            })
        }

        // verification si le la condidature Existe
        const candidatureDocs = await db.collection("candidature")
        .where(
            Filter.and(
                Filter.where("idPublic","==",idPublic),
                Filter.where("statut", "==","en_attente"),
                Filter.where("locataireId","==",locataireId)
            )
        )
        .limit(1)
        .get()

        if(candidatureDocs.empty){
            return res.status(404).json({
                success: false,
                msg : req.t("error.candidature_not_found",{ns: "responses"})
            })
        }

        // modification de la candidature
        const candidatureRef  = candidatureDocs.docs[0].ref
        await candidatureRef.update({
            updateAt: Timestamp.now(),
            demande,
            visite,
        })
        const candidature = (await candidatureRef.get()).data()

        const notification = await createNotification({ 
            destinataireId: req.role != "bailleur" ? candidature?.bailleurId : candidature?.locataireId,
            typeDestinataire : req.role == "bailleur" ? "locataire" : "bailleur", 
            type: "candidature", 
            cibleId: idPublic,
            typeCible: "candidature", 
            message: req.t("notification.application_updated.message",
                {ns: "responses", user : `${req.user?.prenom} ${req.user?.nom}`}), 
            titre: req.t("notification.application_updated.title",{ns: "responses"}),
            lang: req.language
        })

        return res.status(200).json({
            success: true,
            candidature,
            msg : req.t("success.update_candidature",{ns:"responses"})
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

module.exports = {updateCandidature}