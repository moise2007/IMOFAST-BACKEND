/**
 * Vérifie qu'une requête contient au moins un fichier.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
const validateUploadFiles = (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
            success: false,
            message: "Aucun fichier reçu.",
        });
    }

    next();
};

/**
 * Vérifie les données nécessaires à la suppression d'un média.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
const validateDeleteMedia = (req, res, next) => {
    const { key } = req.body;

    if (
        typeof key !== "string" ||
        !key.trim()
    ) {
        return res.status(400).json({
            success: false,
            message: "La clé du fichier est requise.",
        });
    }

    next();
};

module.exports = { validateUploadFiles, validateDeleteMedia };