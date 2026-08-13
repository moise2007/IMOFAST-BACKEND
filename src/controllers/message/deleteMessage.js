const { db, admin } = require("../../config/firebase")
const {Filter} =  admin.firestore


const deleteMessage = async(req,res)=>{
    try{
        const {
            conversationId,
        } = req.body
        const idPublic = req.params.id
        const auteurId = req.user.idPublic
        
        //verification si la conversation existe 
        const conversationRef = await db.collection("conversation")
        .where("conversationId","==",conversationId)
        .get()

        if(conversationRef.empty){
            return res.json({
                sucess: false,
                msg: req.t("error.conversation_not_found",{ns: "responses"})
            })
        }


        // verification si le message existe
        const messageRef = await db.collection("message")
        .where(Filter.and(
            Filter.where("idPublic","==",idPublic),
            Filter.where("auteurId","==",auteurId),
        ))
        .limit(1)
        .get()

        if(messageRef.empty){
            return res.status(400).json({
                success: false,
                msg: req.t("error.message_not_found",{ns: "responses"})
            })
        }

        // suppression du message
        messageRef.docs[0].ref.delete


        return res.status(200).json({
            success: true,
            message : messageReturn,
            msg: req.t("success.message_deleted",{ns : "responses"})
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

module.exports = {deleteMessage}