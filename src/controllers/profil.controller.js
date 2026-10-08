const { asyncHandler } = require("../utils/asyncHandler");
const profilService = require("../services/ApiService/profil.service");

/**
 * Récupère les informations d'un profil.
 *
 * @route POST /getProfil
 */
const getProfil = asyncHandler(async (req, res) => {
    const {
        idPublic,
        role,
    } = req.validatedBody;

    const profil = await profilService.getProfil({
        idPublic,
        role,
    });

    return res.status(200).json({
        success: true,
        profil,
        msg: req.t("success.get_profil", {
            ns: "responses",
        }),
    });
});

module.exports = {
    getProfil,
};