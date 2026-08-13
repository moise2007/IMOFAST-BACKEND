
const { db, admin } = require("../../config/firebase")
const { Annonce } = require("../../models/annonce")
const {Filter} = admin.firestore
const { formaterObjet } = require("../../services/clearData")
const {createId} = require("@paralleldrive/cuid2")
const { createMetaDataAnnonce } = require("../../services/createMetaDataAnnonce.service")

function Verifie(bien,t){
    const missingKeys = []
    if(!bien?.titre){
        missingKeys.push("title")
    }
    if(!bien?.description){
        missingKeys.push("description")
    }
    if(bien?.loyer?.length == 0){
        missingKeys.push("loyer")
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

const createAnnonceBailleur = async(req,res)=>{
    try{
        console.log(req.body)
        // nettoyage de la requete  body
        const dataNettoyer = formaterObjet(req.body)

        //verification des donnes
        const isvalid = Verifie(dataNettoyer,req.t)
        if(!isvalid.valid){
            return res.status(401).json({
                success: false,
                msg: isvalid.msg
            })
        }
        const bailleurId = req.user.idPublic
        const {bienId} = req.body
        // verification si le bien est celui du bailleur
        const biensDocs = await db.collection("bien")
        .where(Filter.and(
            Filter.where("idPublic","==",bienId),
            Filter.where("bailleurId",'==',bailleurId)
        )).get()
        if(biensDocs.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        // verification s'il n y'a pas d'annonce sur le bien
        const AnnonceDocs = await db.collection("annonce").where(
            Filter.and(
                Filter.where("bienId","==",bienId),
                Filter.where("bailleurId","==",bailleurId)
            )
        ).get()
        if(AnnonceDocs.size >=2){
            return res.json({
                success: false,
                msg: req.t("max_annonce",{ns : "errors"})
            })
        }
        const id = createId()
        const annonce = {...dataNettoyer,idPublic: id,bailleurId}

        // creation des metaData
        const metaData ={note : createMetaDataAnnonce(req.user), approbationAdmin: false}
        const annonceFireBase = new Annonce({...annonce,verifie:req.user?.verification?.estDigne,metaData}).toFirebase()

        const annonceRef = await (await db.collection("annonce").add(annonceFireBase)).get()
        const annonceDb = {...annonceRef.data()}
        return res.status(200).json({
            success: true,
            msg: req.t("success.create_annonce",{ns: "responses"}),
            annonce: annonceDb
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
module.exports = {createAnnonceBailleur}
