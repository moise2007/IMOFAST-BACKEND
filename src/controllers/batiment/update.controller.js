const { db , admin} = require("../../config/firebase");
const { sendEmailToAlertError } = require("../../services/sendMailErrorProduction.service");
const {Filter} = admin.firestore;
const TimeStamp = admin.firestore.Timestamp;

function verifieBatiment({nom, ville,quartier,prixGoudron}){
    const error = [];

    if(!nom || nom?.length < 3){
        error.push("le nom");
    }
    if(!ville || ville?.length < 2){
        error.push("la ville");
    }
    if(!quartier || quartier?.length < 2){
        error.push("le quatier");
    }
    if(prixGoudron === undefined || prixGoudron === null || !/^\d+$/.test(String(prixGoudron))){
        error.push("le prix pour le goudron");
    }
    return error.length == 0 ? null : error.slice(0,error.length-1).join(", ") + " et " +error[error.length - 1];
}

const updatebatiment = async(req,res)=>{

    try{
        // recuperation de donnees
        const { nom,ville, equipement, gardien,portail,
            jardin, piscine, environement, barriere, dateConstruction,
            prixGoudron, quartier, lon, lat, adresse} = req.body;

        const bailleurId = req.user.idPublic;
        const id = req.params.id;

        // verification des donnees
        const valid = verifieBatiment({nom,ville,quartier,prixGoudron});
        if(valid){
            return res.status(422).json({
                success: false,
                msg: valid
            })
        }
        if(!id){
            return res.status(404).json({
                success: false,
                msg: "le batiment n'existe pas"
            })
        }

        // creation de l'object dans fireBase
        const batimentSnapshot = await db.collection("batiment").where(Filter.and(
            Filter.where("gestionnaires","array-contains",bailleurId),
            Filter.where("idPublic","==",id)
        )).limit(1).get()

        if(batimentSnapshot.empty){
            return res.status(404).json({
                success: false,
                msg: "le batiment n'existe pas"
            })
        }

        // modification de donnees
        await batimentSnapshot.docs[0].ref.update({
            jardin, piscine, environement,barriere, dateConstruction,prixGoudron,
            equipement, gardien, portail, "localisation.ville" : ville,
            "localisation.pays" : pays,"localisation.quartier" : quartier,
            "localisation.lat" : lat, "localisation.lon" : lon, "localisation.adresse" : adresse,
            updatedAt: TimeStamp.now(),
        })

        return res.status(201).json({
            success: true,
            msg : "batiment crée avec succèss",
            batiment:batimentObject
        })
    }    
    catch(err){
        console.log('erreur de creation du batiment : '+err);
        await sendEmailToAlertError({
            title: "erreur de creation de batiment",
            error: err,
            req,
        })
        return res.status(500).json({
            success: false,
            msg: "une erreur inconnue s'est produite"
        })
    }
}

module.exports = {updatebatiment}