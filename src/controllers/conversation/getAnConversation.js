const { db, admin } = require("../../config/firebase")
const { Conversation } = require("../../models/conversation")
const {Filter} = admin.firestore

const getOneConversation = async (req,res)=>{
    try{
        const idPublic = req.params.id
        const senderId = req.user.idPublic
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

        // recuperation des consersations
        const conversation = conversationRef.docs[0].data()

        //recuperation de l'autre utilisateur
        let autreUser = null
        const idAutre = req.role == "bailleur" ? conversation.locataireId : conversation.bailleurId
        const autreCollection = req.role == "bailleur" ? "locataire" : "bailleur"
        const snapshotUser = await db.collection(autreCollection).where("idPublic","==",idAutre).limit(1).get()
        if(snapshotUser.empty){
            return res.status(200).json({
                success: false,
                msg: req.t("not_found",{ns: 'errors'})
            })
        }
        autreUser = snapshotUser.docs[0].data()

        await conversationRef.docs[0].ref.update({
            [`nonLus.${senderId}`] : 0
        })

        return res.status(200).json({
            success: true,
            conversation: {...conversation,autreUser},
            msg: req.t("success.conversation_loaded",{ns: "responses"})
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

module.exports = {getOneConversation}