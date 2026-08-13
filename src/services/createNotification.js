const createNotification = async ({ destinataireId, typeDestinataire, type, cibleId, typeCible, titre, message,})=>{
    try{
        const response = await fetch(`${process.env.BASE_URL}/api/notification/create`,{
            method: "POST",
            headers: {"Content-Type" : "application/json"},
            body: { destinataireId, typeDestinataire, type, cibleId, typeCible, titre, message,}

        })

        if(!response.ok){
            return response.status(400).json({
                sucess: false ,
                msg: req.t("server_error",{ns:"errors"})
            })
        }
        const data = await response.json()
        return response.status(200).json({
            ...data
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