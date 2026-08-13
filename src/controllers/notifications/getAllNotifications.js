const { db, admin } = require("../../config/firebase")
const { Notification } = require("../../models/notification")
const {Filter} = admin.firestore


const getNotification = async(req,res)=>{
    try{
        const destinataireId = req.user.idPublic

        // recherhce de la notification
        const notificationRef = await db.collection("notification").where("destinataireId","==",destinataireId)
        .limit(30)
        .get()

        // recuperation des notification
        const notifications = notificationRef.docs.map(notif => notif.data())

        return res.status(200).json({
            success: true,
            notifications,
            totla: notifications.length,
            msg: req.t("success.get_notification",{ns: "responses"}),
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
module.exports = {getNotification}