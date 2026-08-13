const { createId } = require("@paralleldrive/cuid2")
const { admin, db } = require("../../config/firebase")
const TimeStamp = admin.firestore.Timestamp

const sendMessageServiceClient = async(req,res)=>{
    try{    
        const  {
            message,
            object
        } =req.body

        if(object.length < 2  || message?.length < 5 || message > 5000 || object > 512){
            return res.status(200).json({
                success: false,
                msg: "veuillez entrer un message et un object conrrespondant aux critères"
            })
            
        }
        const role = req?.role ?? "visiteur"
        const userId = req?.user?.idPublic ?? null
        const idPublic = createId()
        const createdAt = TimeStamp.now()

        await db.collection("message_user").add({message,object,role,userId,idPublic,createdAt})

        // signaler par Email de l'admin

        return res.status(200).json({
            success: true,
            msg: "votre message a été recu avec succèss notre equipe est déjà entrain de l'analyser. nous vous ferons un retour le plus tot possible"
        })
    }catch(err){
        console.log(err)
        return res.status(200).json({
            success: false,
            msg: "nous n'avons pas puis envoyer votre message, réessayer plustard!"
        })
    }
}
module.exports = {sendMessageServiceClient}