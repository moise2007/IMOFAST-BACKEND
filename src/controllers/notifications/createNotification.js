const { db } = require("../../config/firebase")
const { Notification } = require("../../models/notification")
const {createId} = require("@paralleldrive/cuid2")


const createNotification = async(req,res)=>{
    try{
        const { destinataireId, typeDestinataire, type, cibleId, typeCible, titre, message,} =req.body

        // validation du type de notification
        // if(!["candidature","conversation","message","favoris","commentaire","note"].includes(type)){
        //     return res.status(409).json({
        //         success: false,
        //         msg: req.t("invalid_notification_type",{ns:"errors"}),

        //     })
        // }
        const idPublic = createId()

        // creation de la notification
        const notificationFirebase = new Notification({ destinataireId, typeDestinataire, type, cibleId, idPublic, typeCible, titre, message,}).toFirebase()
        const notificationRef = await db.collection("notification").add(notificationFirebase)

        const notification = (await notificationRef.get()).data()
        return res.status(200).json({
            success: true,
            msg: req.t("success.create_notification",{ns: "responses"}),
            notification
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

module.exports = {createNotification}