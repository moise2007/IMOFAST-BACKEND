const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore

const getAllConversation = async (req,res)=>{
    try{
        const senderId = req.user.idPublic
        const field = req.role == "bailleur" ? "bailleurId" : "locataireId"
        const fieldAutre = req.role != "bailleur" ? "bailleurId" : "locataireId"

        // recuperation de la conservation
        const conversationRef = await db.collection("conversation")
        .where(Filter.and(
            Filter.where(field, "==", senderId),
        ))
        .orderBy("updatedAt","desc")
        .get();
        // verification de l'exitence
        if(conversationRef.empty){
            return res.status(200).json({
                success: true,
                total: 0,
                conversations: [],
                msg: req.t("not_found",{ns: 'errors'})
            })
        }

        // recuperation des consersations
        let conversations = conversationRef.docs.map(conv => conv.data())
        conversations = conversations.filter(conv=>!conv.delete[senderId])
        const tabIdAutre = conversations.map(conv=>conv[fieldAutre])
        const autreCollection = req.role == "bailleur"? "locataire": "bailleur"

        let autresUsers = await db.collection(autreCollection)
        .where("idPublic","in",tabIdAutre)
        .get()

        autresUsers = autresUsers.docs.map(doc=>doc.data())

        if(autresUsers.empty){
            throw new Error()
        }
        
        conversations = conversations.map(doc=>{
            const user=  autresUsers.filter(user=>user.idPublic == doc[fieldAutre])[0]
            return {
                ...doc,
                autreParticipant:{
                    nom: user?.nom,
                    prenom: user?.prenom,
                    photoProfil: user?.photoProfil,
                    enligne: user?.enligne
                }
            }
        })

        return res.status(200).json({
            success: true,
            total: conversations.length,
            conversations,
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

module.exports = {getAllConversation}