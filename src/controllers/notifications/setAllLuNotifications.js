const { db, admin } = require("../../config/firebase")
const { Notification } = require("../../models/notification")
const {Filter} = admin.firestore


const setAllLuNotification = async(req,res)=>{
    try{
        const destinataireId = req.user.idPublic

        // recherhce de la notification
        const notificationRef = await db.collection("notification").where("destinataireId","==",destinataireId)
        .limit(30)
        .get()

        // verification si ce n'est pas vide
        if(notificationRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        // marquer tous les notification comme lu
        const batch = db.batch()

        notificationRef.docs.forEach(doc =>{
            batch.update(doc.ref, {
                vu: true,
                updateAt: new Date()
            })
        })
        await batch.commit()

        return res.status(200).json({
            success: true,
            notifications,
            msg: req.t("success.mark_all_as_notification",{ns: "responses"}),
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
module.exports = {setAllLuNotification}