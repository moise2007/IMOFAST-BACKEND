
const express = require("express")
const { routerOTP } = require("./otp.route")
const { routerLocataire } = require("./locataire/locataire.route")
const { routerBailleur } = require("./bailleur/bailleur.route")
const { authBailleur, authBailleurLocataireAdmin, authAdminLocataire, authBailleurAdmin, authAdmin } = require("../middlewares/auth")
const multer = require("multer")
const { upload,uploadMedia } = require("../config/multer")
const { identifiantExiste } = require("../controllers/shared/identifiantExiste")
const { connexion } = require("../controllers/shared/connexion")
const { upLoadFiles, supprimerMedia } = require("../controllers/shared/upload")
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
const { routerAlerteur } = require("./alerteur.route")
const { routerPaiement } = require("./paiement.route")
const { routerServiceClient } = require("./serviceClient.route")


const router = express.Router()


router.use("/locataire",limitGlobal,routerLocataire)
router.use("/bailleur",limitGlobal,routerBailleur)
router.post("/connexion/:role",limitAuth,connexion)
router.use("/otp",limitAuth,routerOTP)
router.post("/identifiantexiste/:role",limitAuth,identifiantExiste)
router.use("/location",limitGlobal,RouterLocation)

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




//configuration de multer
const middlewareUploads = uploadMedia.fields([
    {name: "cni",maxCount: 2},
    {name: "imageAncienContrat", maxCount: 5},
    {name: "photoProfil",maxCount: 1},
    {name: "imageAnnonce",maxCount: 6},
    {name: "videoAnnonce",maxCount: 3},
    {name: "audioMessage",maxCount: 1},
    {name: "videoMessage",maxCount: 1},
    {name: "imageMessage",maxCount: 1}

])
router.post("/upload-media",limitUpload,authBailleurLocataireAdmin,middlewareUploads,upLoadFiles)
router.delete("/delete-media",limitUpload,authBailleurLocataireAdmin,supprimerMedia)

module.exports = { router }