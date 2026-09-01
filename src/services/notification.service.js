const { default: i18next } = require("../config/i18n.config")
const { io } = require("../config/socket.io")
const { webpush } = require("../config/webPush")
const { Users } = require("./auto/usersGetting")

const createNotification = async ({ destinataireId, typeDestinataire, type, cibleId, typeCible, titre, message,lang="fr"})=>{
    
    try{
        const response = await fetch(`${process.env.BASE_URL}/api/notification/create`,{
            method: "POST",
            headers: {"Content-Type" : "application/json"},
            credentials: "include",
            body: JSON.stringify({ destinataireId, typeDestinataire, type, cibleId, typeCible, titre, message,})

        })

        if(!response.ok){
            throw new Error('')
        }
        const data = await response.json()

        io.to(destinataireId).emit("notification",{
            type: type,
            message: message,
            titre: titre
        })
        return data
    }
    catch(err){
        console.log(err)
        return {
            success: false,
            msg: i18next.t("server_error",{
                lng: lang,
                ns:"errors"
            })
        }
    }
}
async function sendNotification(title,description,url){
    try{
        const payload = JSON.stringify({
            title: title,
            body: description,
            icon: "https://imofast.org/logo.png",
            badge: "https://imofast.org/logo.png",
            url: url,
        })
        const subs = Users.COMPTE_CACHE.bailleur?.map(loc=>loc?.notificationData)?.filter(v=>v)

        subs?.forEach(async (sub) => {
            await webpush.sendNotification(
                sub,payload
            )
        });
        return true
    }
    catch(err){
        console.log(err)
        return false
    }
    
    
}
module.exports = {createNotification,sendNotification}