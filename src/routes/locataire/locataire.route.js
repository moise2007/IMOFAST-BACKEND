// creation du router des locataires 
const exppress =require("express")
const { createLocataire } = require("../../controllers/locataires/create")
const { updateLocataire } = require("../../controllers/locataires/update")
const { deleteLocataire } = require("../../controllers/locataires/delete")
const { deconnexionLocataire } = require("../../controllers/locataires/deconnexion")
const { getDataLocataire } = require("../../controllers/locataires/getDate")
const { verifieEmailLocataire } = require("../../controllers/locataires/verifieEmail")
const { updatePasswordLocataire } = require("../../controllers/locataires/updatepaswword")
const { authLocataire, authBailleurLocataireAdmin } = require("../../middlewares/auth")
const { getProfilLocataire } = require("../../controllers/locataires/getProfil")
const routerLocataire = exppress.Router()



// route de creation d'un locataire
routerLocataire.post("/create",createLocataire)

// route de modification d'un locataire
routerLocataire.patch("/update/data",authLocataire,updateLocataire)

//route de modification de mot de passe
routerLocataire.patch("/update/password",authLocataire,updatePasswordLocataire)

//route de suppression d'un utilisateur
routerLocataire.delete("/delete",authLocataire,deleteLocataire)


//route de deconnexion Locataire
routerLocataire.post("/deconnexion",authBailleurLocataireAdmin, deconnexionLocataire)

// route de recuperation des donnes locataires
routerLocataire.get("/getData",authLocataire,getDataLocataire)

// route de recuperation des donnes locataires
routerLocataire.get("/profil/:id",authBailleurLocataireAdmin,getProfilLocataire)


//route de verification de l'email par code
routerLocataire.post("/otp/verifier/email",verifieEmailLocataire)



module.exports = { routerLocataire }