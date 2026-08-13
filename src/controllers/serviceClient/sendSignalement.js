const { createId } = require("@paralleldrive/cuid2")
const { admin, db } = require("../../config/firebase")
const TimeStamp = admin.firestore.Timestamp

const sendSignalementServiceClient = async(req,res)=>{
    try{    
        const {
            type,
            idElement,
            message,
            image
        } = req?.body
        const role = req?.role ?? "visiteur"
        const userId = req?.user?.idPublic ?? null
        const idPublic = createId()
        const createdAt = TimeStamp.now()

        await db.collection("signalement").add({message,image,role,userId,idPublic,createdAt,type: "signalement",nature:type,idElement,statut: "en_attente",vu: false})

        // signaler par Email de l'admin

        return res.status(200).json({
            success: true,
            msg: "votre Signalement a été recu avec succèss notre equipe est déjà entrain de l'analyser. nous vous ferons un retour le plus tot possible"
        })
    }catch(err){
        console.log(err)
        return res.status(200).json({
            success: false,
            msg: "nous n'avons pas puis envoyer votre Signalement, réessayer plustard!"
        })
    }
}
module.exports = {sendSignalementServiceClient}