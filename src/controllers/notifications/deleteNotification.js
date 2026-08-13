const { db, admin } = require("../../config/firebase")
const { Notification } = require("../../models/notification")
const {Filter} = admin.firestore


const deleteNotification = async(req,res)=>{
    try{
        const idPublic =req.params.id

        const destinataireId = req.user.idPublic

        // recherhce de la notification
        const notificationRef = await db.collection("notification").where(
            Filter.and(
                Filter.where("idPublic","==",idPublic),
                Filter.where("destinataireId","==",destinataireId)
            )
        )
        .limit(1)
        .get()

        if(notificationRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        //suppression de la notification
        await notificationRef.docs[0].ref.delete()

        return res.status(200).json({
            success: true,
            msg: req.t("success.delete_notification",{ns: "responses"}),
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
module.exports = {deleteNotification}