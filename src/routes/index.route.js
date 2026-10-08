
const express = require("express")
const { routerLocataire } = require("./locataire.route")
const { routerBailleur } = require("./bailleur.route")
const { authBailleurLocataireAdmin, authAdminLocataire, identifierUtilisateur } = require("../middlewares/auth")
const { identifiantExiste } = require("../controllers/shared/identifiantExiste")
const { connexion } = require("../controllers/shared/connexion")
const { RouterLocation } = require("./localisation.route")
const { routerAgenda } = require("./agenda.route")
const { routerAnnonce } = require("./annonce.route")
const { routerBien } = require("./bien.route")
const { routerCandidature } = require("./candidature.route")
const { routerContrat } = require("./contract.route")
const { routerConversation } = require("./conversation.route")
const { routerMessage } = require("./message.route")
const { routerCommentaire } = require("./commentaire.route")
const { routerFavoris } = require("./favoris.route")
const { routerNote } = require("./note.route")
const { routerNotification } = require("./notification.route")
const { routerProfil } = require("./profil.route")
const { routerSignalement } = require("./signalement.route")
const { routerStatistiques } = require("./statistique.route")
const { routerAdmin } = require("./admin/admin.route")
const { routerContact } = require("./contact.route")
const { limitGlobal, limitAuth, limitUpload } = require("../middlewares/rateLimit")
const { routerAlerteur } = require("./alerte.route")
const { routerPaiement } = require("./paiement.route")
const { routerServiceClient } = require("./serviceClient.route")
const { routerAnalitic } = require("./analytic.route")
const { routerAuthAdmin } = require("./admin/auth.route")
const { routerBatiment } = require("./batiment.route")
const { routerAuthentification } = require("./authentification.route")
const { routerUpload } = require("./upload.route")


const router = express.Router()


router.use("/locataire",limitGlobal,routerLocataire)
router.use("/bailleur",limitGlobal,routerBailleur)
router.post("/connexion/:role",limitAuth,connexion)
router.use("/auth",limitAuth,routerAuthentification)
router.post("/identifiantexiste/:role",limitAuth,identifiantExiste)
router.use("/location",limitGlobal,RouterLocation)
router.use("/analitic",limitGlobal,routerAnalitic)
router.use("/agenda",limitGlobal,routerAgenda)
router.use("/annonce",limitGlobal,routerAnnonce)
router.use("/bien",limitGlobal,routerBien)
router.use("/candidature",limitGlobal,routerCandidature)
router.use("/contrat",limitGlobal,routerContrat)
router.use("/conversation",limitGlobal,routerConversation)
router.use("/message",limitGlobal,routerMessage)
router.use("/commentaire",limitGlobal,routerCommentaire)
router.use("/favoris",limitGlobal,authAdminLocataire,routerFavoris)
router.use("/note",limitGlobal,routerNote)
router.use("/notification",limitGlobal,routerNotification)
router.use("/profil",limitGlobal,routerProfil)
router.use("/signalement",limitGlobal,routerSignalement)
router.use("/statistiques",limitGlobal,routerStatistiques)
router.use("/admin",limitGlobal,routerAdmin)
router.use("/contact",limitGlobal,routerContact)
router.use("/alerte",limitGlobal,routerAlerteur)
router.use("/service-client",limitGlobal,routerServiceClient)
router.use("/paiement",limitAuth,routerPaiement)
router.use("/batiment",limitGlobal,routerBatiment)
router.use("/upload",limitUpload,routerUpload)
router.get("/init",limitGlobal, identifierUtilisateur,(req,res)=>{
    return res.status(200).json({
        success: true,
        role: req.role,
        user: req?.user
    })
} )





module.exports = { router }