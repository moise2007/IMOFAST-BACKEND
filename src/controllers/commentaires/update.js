const { db, admin} = require("../../config/firebase")
const {Filter} = admin.firestore
const Timestamp = admin.firestore.Timestamp

const updateCommentaire = async(req,res)=>{
    try{
        const role =req.role
        const auteurId= req.user.idPublic
        const idPublic = req.params.id
        const {message} =  req.body

        if(message.length == 0){
            return res.status(409).json({
                success: false,
                msg: req.t("missing_fields",{ns: "responses",fields :"contenu du commentairre"})
            })
        }

        //recherche du commentaire
        const commentaireRef = await db.collection("commentaire")
        .where(Filter.and(
            Filter.where("idPublic","==",idPublic),
            Filter.where("auteurId","==",auteurId),
            Filter.where("role","==",role)
        )).limit(1).get()

        if(commentaireRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("")
            })
        }
        // modification du commentaire
        const commentRef =  commentaireRef.docs[0].ref
        await commentRef.update({
            updatedAt: Timestamp.now(),
            message,
        })
        return res.status(200).json({
            success: true,
            commentaire: (await commentRef.get()).data(),
            msg : req.t("success.commentaire_updated",{ns:"responses"})
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

module.exports = {updateCommentaire}