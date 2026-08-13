const {createId} = require("@paralleldrive/cuid2")
const { Message } = require("../../models/message")
const { db } = require("../../config/firebase")


const sendMessage = async(req,res)=>{
    try{
        const  {
            conversationId,
            type,
            contenu,
            medias,
            lien,
        } = req.body

        if(!["texte","media","lien","bien","profil"].includes(type)){
            return res.json({
                success: false,
                msg : req.t("type_message_error",{ns:"errors"})
            })
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

        // creation du message
        const idPublic = createId()

        // generation de l'object firebase
        const messageFirebase = new Message({type,contenu,medias,lien,conversationId,auteurId: req.user.idPublic,idPublic})
        .toFirebase()

        //creation du message dans firebase
        const messageref = await db.collection("message").add(messageFirebase)


        return res.status(200).json({
            success: true,
            message : (await messageref.get()).data(),
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
module.exports = {sendMessage}