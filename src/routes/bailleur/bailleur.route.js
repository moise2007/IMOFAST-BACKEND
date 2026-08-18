const express = require("express")
const { createBailleur } = require("../../controllers/bailleurs/create")
const { deconnexionBailleur } = require("../../controllers/bailleurs/deconnexion")
const { deleteBailleur } = require("../../controllers/bailleurs/delete")
const { updateDataBailleur } = require("../../controllers/bailleurs/updateData")
const { updateEmailBailleur } = require("../../controllers/bailleurs/updateEmail")
const { updatePasswordBailleur } = require("../../controllers/bailleurs/updatePassword")
const { updateTelephoneBailleur } = require("../../controllers/bailleurs/updateTelephone")
const { authBailleur, authBailleurAdmin } = require("../../middlewares/auth")
const { routerPasswordForgetBailleur } = require("./bailleur.passwordForget.route")
const { CalculBailleur } = require("../../services/calculBailleur")
const { getdataAcceuil } = require("../../controllers/bailleurs/getDataAcceuil")
const { verifieEmailBailleur } = require("../../controllers/bailleurs/verifieEmail")
const { getProfilBailleur } = require("../../controllers/bailleurs/getProfil")

// creation du router 
const routerBailleur = express.Router()

//creation des bailleurs
routerBailleur.post("/create",createBailleur)

// route de recuperation des donnes acceuil bailleur
routerBailleur.get("/get-data-acceuil",authBailleurAdmin,getdataAcceuil)


// deconnexion des bailleurs
routerBailleur.delete("/deconnexion",authBailleur,deconnexionBailleur)

// suppression bailleur
routerBailleur.delete("/suppression",authBailleur,deleteBailleur)

// update data
routerBailleur.patch("/update/data",authBailleur,updateDataBailleur)

// update email
routerBailleur.patch("/update/email",authBailleur, updateEmailBailleur)

//route de verification de l'email par code
routerBailleur.post("/otp/verifier/email",verifieEmailBailleur)

// route de recuperation des donnes locataires
routerBailleur.get("/profil/:id",getProfilBailleur)


// update password quand il est authtifier
routerBailleur.patch("/update/password",authBailleur,updatePasswordBailleur)

//update password quand il est non authtifier
routerBailleur.use("update/passwordForget",routerPasswordForgetBailleur)
// update telephone
routerBailleur.patch("/update/telephone",authBailleur, updateTelephoneBailleur)


// route de recuperation des donnees
routerBailleur.get("/getData",authBailleur,async(req,res)=>{
    try{
        const {id,...user} = req.user
        const result = await CalculBailleur(user)
        console.log(result)
        return res.status(200).json({
            success:result.success,
            msg: "données chargées avec succès",
            path:null,
            redirect:false,
            user: result.bailleur,
        })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({
            success:false,
            msg: "Echec de chargement des données.",
            path:null,
            redirect:false,
        })
    }
})

module.exports = {routerBailleur}