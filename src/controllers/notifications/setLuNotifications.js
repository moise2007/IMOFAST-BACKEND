const { db, admin } = require("../../config/firebase")
const { Notification } = require("../../models/notification")
const {Filter} = admin.firestore


const setLuNotification = async(req,res)=>{
    try{
        const destinataireId = req.user.idPublic
        const idPublic = req.params.id

        // recherhce de la notification
        const notificationRef = await db.collection("notification").where(
            Filter.and(
                Filter.where("destinataireId","==",destinataireId),
                Filter.where("idPublic","==",idPublic)
            )
        )
        .limit(1)
        .get()

        // verification si ce n'est pas vide
        if(notificationRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        // marquer tous les notification comme lu
        notificationRef.docs[0].ref.update({
            vu: true,
            updateAt: new Date()
        })

        return res.status(200).json({
            success: true,
            msg: req.t("success.mark_as_notification",{ns: "responses"}),
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
module.exports = {setLuNotification}