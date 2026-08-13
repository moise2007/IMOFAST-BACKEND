const { default: i18next } = require("../config/i18n.config")
const { io } = require("../config/socket.io")

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

module.exports = {createNotification}