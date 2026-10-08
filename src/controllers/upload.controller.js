const uploadService = require("../services/ApiService/upload.service");

/**
 * Upload les fichiers reçus.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const uploadFiles = async (req, res) => {
    const result = await uploadService.uploadFiles({
        files: req.files,
        req,
    });

    return res.status(200).json({
        success: true,
        message: "Fichiers uploadés avec succès.",
        data: result,
    });
};

/**
 * Supprime un média précédemment uploadé.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const supprimerMedia = async (req, res) => {
    await uploadService.supprimerMedia({
        key: req.body.key,
    });

    return res.status(200).json({
        success: true,
        message: "Fichier supprimé avec succès.",
    });
};

module.exports = {
    uploadFiles,
    supprimerMedia,
};