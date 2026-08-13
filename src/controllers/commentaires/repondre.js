const { db, admin} = require("../../config/firebase")
const {Filter} = admin.firestore
const {createId} = require("@paralleldrive/cuid2")
const Timestamp = admin.firestore.Timestamp

const responseCommentaire = async(req,res)=>{
    try{
        const auteurId= req.user.idPublic
        const role = req.role
        const idPublic = req.params.id
        const {  message, nom, prenom, photoProfil } = req.body

        if(message.length == 0){
            return res.status(409).json({
                success: false,
                msg: req.t("missing_fields",{ns: "responses",fields :"contenu du commentairre"})
            })
        }
        //recherche de commentaire
        const commentaireExisteRef = await db.collection("commentaire")
        .where("idPublic","==",idPublic).limit(1).get()

        if(commentaireExisteRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("error.commentaire_not_fount",{ns: "responses"})
            })
        }

        // creation de la response du commentaire
        const commentaireRef =  commentaireExisteRef.docs[0].ref
        const comment = commentaireExisteRef.docs[0].data()
        commentaireRef.update({
            reponses:[
                ...(comment?.responses ??[]),
                {
                    message,
                    auteurId,
                    role,
                    nom,
                    prenom,
                    photoProfil,
                    createdAt: Timestamp.now(),
                    updateAt: Timestamp.now(),
                    idPublic: createId(),
                }
            ] 
        })


        return res.status(200).json({
            success: true,
            commentaire: (await commentaireRef.get()).data(),
            msg : req.t("success.commentaire_response",{ns:"responses"})
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

module.exports = {responseCommentaire}