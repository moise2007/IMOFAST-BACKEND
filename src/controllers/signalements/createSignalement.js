
const { db } = require("../../config/firebase")
const { Signalement } = require("../../models/signalement")
const { formaterObjet } = require("../../services/clearData")
const {createId} = require("@paralleldrive/cuid2")

const createSignalement = async(req,res)=>{
    try{
        const idAuteur = req.user.idPublic

        const {typeCible,idCible,raison,description} = req.body
        const datacleaned = formaterObjet({idAuteur,typeCible,idCible,raison,description})

        if(!datacleaned?.raison){
            return res.status(401).json({
                sucess: false,
                msg: req.t("required_raison",{ns: "errors"})
            })
        }
        const idPublic = createId()
        const dataSignalement = new Signalement({...datacleaned,idPublic})
        const signalementRef = await(await db.collection("signalement").add(datacleaned)).get()

        return res.status(200).json({
            sucess: false,
            signalement : signalementRef.data(),
            msg: req.t("success.create_signalement",{ns: "responses"})
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

module.exports = {createSignalement}