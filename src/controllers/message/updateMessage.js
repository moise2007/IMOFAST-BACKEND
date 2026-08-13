const { db, admin } = require("../../config/firebase")
const {Filter} =  admin.firestore


const updateMessage = async(req,res)=>{
    try{
        const  {
            conversationId,
            type,
            contenu,
        } = req.body
        const idPublic = req.params.id
        const auteurId = req.user.idPublic

        if(type){
            if(!["texte","media","lien","bien","profil"].includes(type)){
                return res.json({
                    success: false,
                    msg : req.t("type_message_error",{ns:"errors"})
                })
            }
        }
        
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

        //verification si le delai est passe
        const message = messageRef.docs[0].data()
        const expire = new Date()
        expire = expire.setMinutes(expire.getMinutes() + 10);
        if(new Date(message.expiredAt) > expire){
            return req.status(200).json({
                success: true,
                msg: req.t("error.message_edit_forbidden",{ns: "responses"})
            })
        }

        const messageRefUpdate = messageRef.docs[0].ref
        const messageDocs = messageRef.docs[0].ref.update({
            expiredAt : expire,
            contenu,
        })

        const messageReturn = (await messageRefUpdate.get()).data()


        return res.status(200).json({
            success: true,
            message : messageReturn,
            msg: req.t("success.message_created",{ns : "responses"})
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

module.exports = {updateMessage}