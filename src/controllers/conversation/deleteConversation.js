const { db, admin } = require("../../config/firebase")
const { Conversation } = require("../../models/conversation")
const {Filter} = admin.firestore

const deleteConversation = async (req,res)=>{
    try{
        const idPublic = req.params.id
        const senderId = req.user.idPublic

        // recuperation de la conservation
        const conversationRef = await db.collection("conversation").where(Filter.and(
            Filter.where("idPublic","==",idPublic),
            Filter.where(`${req.role == "bailleur" ? "bailleurId" : "locataireId"}`,"==",senderId)
        )).limit(1).get()

        // verification de l'exitence
        if(conversationRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: 'errors'})
            })
        }

        // suppresion de la conversation
        conversationRef.docs[0].ref.update({ [`delete.${senderId}`] : true})
        return res.status(200).json({
            success: true,
            msg:  req.t("success.conversation_deleted",{ns: 'responses'})
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

module.exports = {deleteConversation}