const { db } = require("../../config/firebase");
const { Batiment } = require("../../models/batiment");
const { sendEmailToAlertError } = require("../../services/sendMailErrorProduction.service");


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

const createbatiment = async(req,res)=>{

    try{
            // recuperation de donnees
        const { nom,ville,pays = "cameroun", equipement, gardien,portail,
            jardin, piscine, environement, barriere, dateConstruction,
            prixGoudron, quartier, lon, lat, adresse} = req.body;
        const bailleurId = req.user.idPublic;
        const role = req.role;

        // verification des donnees
        const valid = verifieBatiment({nom,ville,quartier,prixGoudron});
        if(valid){
            return res.status(422).json({
                success: false,
                msg: valid
            })
        }

        // creatiom de l'object pour fireBase
        const batimentObject = new Batiment({
            nom, bailleurId,equipement,gardien, portail, role,
            jardin,piscine, environement, barriere,dateConstruction, prixGoudron,
            localisation: {ville,quartier,pays,lat,lon,adresse}
        })

        // creation de l'object dans fireBase
        await db.collection("batiment").add(batimentObject);

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

module.exports = {createbatiment}