const express = require("express");
const { validateUploadFiles, validateDeleteMedia } = require("../validators/upload.validator")
const  { uploadFiles, supprimerMedia } = require("../controllers/upload.controller");
const { authBailleurLocataireAdmin } = require("../middlewares/auth")
const { uploadMedia } = require("../config/multer")

const routerUpload = express.Router();

//configuration de multer
const middlewareUploads = uploadMedia.fields([
    {name: "cni",maxCount: 2},
    {name: "imageAncienContrat", maxCount: 5},
    {name: "photoProfil",maxCount: 1},
    {name: "imageAnnonce",maxCount: 18},
    {name: "videoAnnonce",maxCount: 6},
    {name: "audioMessage",maxCount: 5},
    {name: "videoMessage",maxCount: 5},
    {name: "imageMessage",maxCount: 18}

])

/**
 * Upload de fichiers.
 *
 * Les champs multipart/form-data acceptés sont :
 * - cni
 * - imageAncienContrat
 * - photoProfil
 * - images
 * - videos
 */
routerUpload.post(
    "/files",
    authBailleurLocataireAdmin,
    middlewareUploads,
    validateUploadFiles,
    uploadFiles
);

routerUpload.delete(
    "/media",
    authBailleurLocataireAdmin,
    validateDeleteMedia,
    supprimerMedia
);

module.exports = {
    routerUpload,
};