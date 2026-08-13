const { db } = require("../../config/firebase")
const { Bien } = require("../../models/biens")
const { formaterObjet } = require("../../services/clearData")
const {createId} = require("@paralleldrive/cuid2")
const { convertirEnFCFA } = require("../../utils/devise")

function Verifie(bien,t){
    const missingKeys = []
    if(bien.images?.length == 0){
        missingKeys.push('images')
    }
    if(!bien?.etage?.min && bien?.etage?.min != 0){
        console.log(bien.etage?.min)
        missingKeys.push("etage")
    }
    if(!bien.nature){
        missingKeys.push("nature")
    }
    if(!bien?.type){
        missingKeys.push("type")
    }
    if(!bien?.etat){
        missingKeys.push("etat")
    }
    if(missingKeys.length == 0){
        return {
            valid: true,
            msg: "ok"
        }
    }
    const fieldsTranslated = missingKeys
        .map(key => t(key,{ns: "errors"}))
        .join(", ")
    return{
        valid: false,
        msg: t('missing_fields',{ns: "errors",fields: fieldsTranslated})
    }
}

const createBienBailleur = async(req,res)=>{
    try{
        // nettoyage de la requete  body
        const dataNettoyer = formaterObjet(req.body)

        if(!dataNettoyer.brouillon){
            //verification des donnes
            const isvalid = Verifie(dataNettoyer,req.t)
            if(!isvalid.valid){
                return res.status(409).json({
                    success: false,
                    msg: isvalid.msg
                })
            }
        }

            
        const bailleurId = req.user.idPublic

        if(dataNettoyer?.prixGoudron ){
            dataNettoyer.prixGoudron = convertirEnFCFA(dataNettoyer?.prixGoudron ,dataNettoyer?.devise ?? "XAF")
        }

        const id = createId()
        const bien = {...dataNettoyer,idPublic: id,bailleurId}
        const bienFireBase = new Bien(bien).toFirebase()

        console.log("ok")
        const bienRef = await (await db.collection("bien").add(bienFireBase)).get()
        const bienDb = {...bienRef.data()}
        console.log(bienDb)
        return res.status(200).json({
            success: true,
            msg: req.t("success.create_bien",{ns: "responses"}),
            bien: bienDb
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
module.exports = {createBienBailleur}