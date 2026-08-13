const { db, admin } = require("../../config/firebase")
const { Conversation } = require("../../models/conversation")
const {Filter} = admin.firestore
const {createId} = require("@paralleldrive/cuid2")

const createConversation = async (req,res)=>{
    try{
        const {auteur1Id} = req.params

        const auteurId = req.user.idPublic

        //verification si la la conversation existe
        const existeConversationRef = await db.collection("conversation")
        .where(Filter.and(
            Filter.where("bailleurId","==", req.role == "bailleur" ? auteurId : auteur1Id),
            Filter.where("locataireId","==", req.role == "locataire" ? auteurId : auteur1Id)
        ))
        .get()

        if(!existeConversationRef.empty){
            const consersationRef = existeConversationRef.docs[0].ref
            await consersationRef.update(
                {
                    [`delete.${auteur1Id}`] : false,
                    [`delete.${auteurId}`] : false
                }
            )
            const conversation = await consersationRef.get()
            return res.status(200).json({
                success: true,
                msg: req.t("success.conversation_created",{ns: "responses"}),
                conversation: conversation.data(),
            })
        }


        //verification si le destinaire existe
        const receiverCollection = req.role == "bailleur" ? "locataire" : "bailleur"

        const receiverRef = await db.collection(receiverCollection)
        .where("idPublic","==",auteur1Id)
        .limit(1)
        .get()

        if(receiverRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("user_not_found",{ns:"errors"})
            })
        }

        const idPublic = createId()
        // creation de la caonversation
        const conversationFirebase = new Conversation({
            bailleurId :req.role == "bailleur" ? auteurId : auteur1Id,
            locataireId:req.role == "locataire" ? auteurId : auteur1Id,
            idPublic
        }).toFirebase()

        const conversationRef= await db.collection("conversation").add(conversationFirebase)
        const conversation = (await conversationRef.get()).data()
        return res.status(200).json({
            success: true,
            msg: req.t("success.conversation_created",{ns: "responses"}),
            conversation,
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

module.exports = {createConversation}