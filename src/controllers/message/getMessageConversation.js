const { db, admin } = require("../../config/firebase")
const {Filter} =  admin.firestore


const getMessage = async(req,res)=>{
    try{
        const  conversationId = req.params.id
        const auteurId = req.user.idPublic
        const {lastId} = req.query
        //verification si la conversation existe 
        const conversationRef = await db.collection("conversation")
        .where("idPublic","==",conversationId)
        .get()

        if(conversationRef.empty){
            return res.json({
                sucess: false,
                hasMore: false,
                msg: req.t("error.conversation_not_found",{ns: "responses"})
            })
        }

        // recuperation des messages d'une conversation

        // verifie si l'utilisateur faire partie de la conversation
        const conversation = conversationRef.docs[0].data()

        if(!(conversation[`${req.role}Id`] == auteurId)){ 
            return res.status(404).json({
                success: false,
                hasMore: false,
                msg: req.t("forbidden",{ns: "error"})
            })
        }
        let lastdoc = null
        let queryMessage = db.collection("message")
        if(lastId){
            const snapshot = await queryMessage.where("idPublic","==",lastId).limit(1).get()
            if(snapshot.empty){
                return res.status(404).json({
                success: false,
                hasMore: false,
                msg: req.t("not_found",{ns: "error"})
            })
            }
            lastdoc = snapshot.docs[0]
        }
        // queryMessage = queryMessage.where("supprime","==",false)
        queryMessage = queryMessage
        .where("conversationId","==",conversationId)
        .limit(30)
        .orderBy("createdAt","desc")

        if(lastdoc){
            queryMessage = queryMessage.startAfter(lastdoc)
        }

        let messageDocs = await queryMessage.get()

        //marquer les messages comme lu
        
        const batch  = db.batch()
        messageDocs.docs.forEach(msg=>{
            const msgData = msg.data()
            if(msgData.auteurId !== auteurId && msgData.lu == false && conversation.idParticipants.includes(msgData.auteurId))
                batch.update(msg.ref,{lu: true})
        })
        await batch.commit()

        messageDocs = await queryMessage.get()

        const messages= messageDocs?.docs.map(msg => msg.data())

        return res.status(200).json({
            success: true,
            messages,
            hasMore: messages.length ==30,
            msg: req.t("success.message_created",{ns : "responses"})
        })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            hasMore: false,
            msg: req.t("server_error",{ns: "errors"})
        })
    }


}
module.exports = {getMessage}