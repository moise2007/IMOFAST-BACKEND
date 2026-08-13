const { db, admin } = require("../../config/firebase")
const { Conversation } = require("../../models/conversation")
const {Filter} = admin.firestore

const setLuConversation = async (req,res)=>{
    try{
        const idPublic = req.params.id
        const {senderId} = req.user.idPublic
        const field = req.role == "bailleur" ? "bailleurId" : "locataireId"

        // recuperation de la conservation
        const conversationRef = await db.collection("conversation")
        .where(Filter.and(
            Filter.where("idPublic", "==", idPublic),
            Filter.where(`delete.${senderId}`,"==",false),
            Filter.where(field,"==",senderId)
        ))
        .limit(1)
        .get();

        // verification de l'exitence
        if(conversationRef.empty){
            return res.status(200).json({
                success: false,
                msg: req.t("not_found",{ns: 'errors'})
            })
        }

        // marquer la conversation comme lu
        conversationRef.docs[0].ref.update({
            [`nonLus.${senderId}`]: 0
        })
        return res.status(200).json({
            success: true,
            msg: req.t("success.conversation_marked_as_read",{ns: "responses"})
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

module.exports = {setLuConversation}