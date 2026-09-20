const { db } = require("../../config/firebase")
const { Bien } = require("../../models/biens")
const { formaterObjet } = require("../../services/clearData")
const {createId} = require("@paralleldrive/cuid2")
const { convertirEnFCFA } = require("../../utils/devise")
const { Regex } = require("../../services/regex")
const { Bureau } = require("../../models/bureau")
const { Boutique } = require("../../models/Boutique")
const { Terrain } = require("../../models/terrain")

function Verifie(bien,t){
    const missingKeys = []
    if(bien.images?.length == 0){
        missingKeys.push('images')
    }
    if(!bien?.etage?.min && bien?.etage?.min != 0){
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


function verifieBureau(bureau){
    const errors = []
    const {superficie, forme, etapeMin, etapeMax, exemplaire,pays, ville, quartier,images, videos} = bureau
    if(!superficie || !Regex.isNumber(superficie)){
        errors.push("superficie")
    }
    if(!["triangle","carré","rectangle","parralélogramme","trapèze","irrégulière"].includes(forme)){
        errors.push("forme")
    }

    if(!Regex.isNumber(etapeMax) || !Regex.isNumber(etapeMin)){
        errors.push("étape")
    }

    if(etapeMin > etapeMax){
        errors.push("étage inférieur")
    }
}


const createBienBailleur = async(req,res)=>{
    try{
        // nettoyage de la requete  body
        const dataNettoyer = formaterObjet(req.body)

        const {
            isBureau=false, bureau, 
            isBoutique=false, boutique, 
            isTerrain=false, terrain,
            ...logement
        } = dataNettoyer

        const isLogement = !(isBoutique || isBureau || isTerrain)
        if(!dataNettoyer.brouillon && isLogement){
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

        if(isBureau){
            const {exemplaires} = bureau
            const idCommun = createId()
            const bureauData = [], bureauFireBase = []
            for(let i=0; i< exemplaires.libre; i++){
                const data =  new Bureau({...bureau, etat: "libre",idCommun}).toFireBase()
                bureauData.push(data)
                bureauFireBase.push(db.collection("bien").add(data))
            }
            for(let i=0; i< exemplaires.occuper; i++){
                const data =  new Bureau({...bureau, etat: "occuper",idCommun}).toFireBase()
                bureauData.push(data)
                bureauFireBase.push(db.collection("bien").add(data))
            }
            for(let i=0; i< exemplaires.construction; i++){
                const data =  new Bureau({...bureau, etat: "construction",idCommun}).toFireBase()
                bureauData.push(data)
                bureauFireBase.push(db.collection("bien").add(data))
            }

            await Promise.all(bureauFireBase)

            return res.status(200).json({
                success: true,
                msg: req.t("success.create_bien",{ns: "responses"}),
                bureau: bureauData
            })
        }

        if(isBoutique){
            const {exemplaires} = boutique
            const idCommun = createId()
            const boutiqueData = [], boutiqueFireBase = []
            for(let i=0; i< exemplaires.libre; i++){
                const data =  new Boutique({...boutique, etat: "libre",idCommun}).toFireBase()
                boutiqueData.push(data)
                boutiqueFireBase.push(db.collection("bien").add(data))
            }
            for(let i=0; i< exemplaires.occuper; i++){
                const data =  new Boutique({...boutique, etat: "occuper",idCommun}).toFireBase()
                boutiqueData.push(data)
                boutiqueFireBase.push(db.collection("bien").add(data))
            }
            for(let i=0; i< exemplaires.construction; i++){
                const data =  new Boutique({...boutique, etat: "construction",idCommun}).toFireBase()
                boutiqueData.push(data)
                boutiqueFireBase.push(db.collection("bien").add(data))
            }
            await Promise.all(boutiqueFireBase)
            return res.status(200).json({
                success: true,
                msg: req.t("success.create_bien",{ns: "responses"}),
                boutique: boutiqueData
            })
        }

        if(isTerrain){
            const {exemplaires} = terrain
            const idCommun = createId()
            const terrainData = [], terrainFireBase = []
            for(let i=0; i< exemplaires.libre; i++){
                const data =  new Terrain({...terrain, etat: "libre",idCommun}).toFireBase()
                terrainData.push(data)
                terrainFireBase.push(db.collection("bien").add(data))
            }
            for(let i=0; i< exemplaires.occuper; i++){
                const data =  new Terrain({...terrain, etat: "occuper",idCommun}).toFireBase()
                terrainData.push(data)
                terrainFireBase.push(db.collection("bien").add(data))
            }
            for(let i=0; i< exemplaires.construction; i++){
                const data =  new Terrain({...terrain, etat: "construction",idCommun}).toFireBase()
                terrainData.push(data)
                terrainFireBase.push(db.collection("bien").add(data))
            }
            await Promise.all(terrainFireBase)
            return res.status(200).json({
                success: true,
                msg: req.t("success.create_bien",{ns: "responses"}),
                terrain: terrainData
            })
        }

        if(isLogement){
            if(dataNettoyer?.prixGoudron ){
                dataNettoyer.prixGoudron = convertirEnFCFA(dataNettoyer?.prixGoudron ,dataNettoyer?.devise ?? "XAF")
            }

            const id = createId()
            const bien = {...dataNettoyer,idPublic: id,bailleurId}
            const bienFireBase = new Bien(bien).toFirebase()

            const bienRef = await (await db.collection("bien").add(bienFireBase)).get()
            const bienDb = {...bienRef.data()}
            return res.status(200).json({
                success: true,
                msg: req.t("success.create_bien",{ns: "responses"}),
                bien: bienDb
            })
        }
        return res.status(422).json({
            success: false,
            msg: "les données fournies sont invalides, veuillez réessayez plus tard!"
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