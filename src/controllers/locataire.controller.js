const locataireService = require("../services/ApiService/locataire.service");

/**
 * Récupère les données du locataire authentifié.
 *
 * @async
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const getDataLocataire = async (req, res) => {
    const data = await locataireService.getDataLocataire(
        req.user
    );

    res.status(200).json({
        success: true,
        data,
    });
};

/**
 * Récupère le profil d'un locataire.
 *
 * @async
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const getProfilLocataire = async (req, res) => {
    const data = await locataireService.getProfilLocataire(
        req.params.id
    );

    res.status(200).json({
        success: true,
        data,
    });
};

/**
 * Met à jour les informations du locataire authentifié.
 *
 * @async
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const updateLocataire = async (req, res) => {
    const data = await locataireService.updateLocataire(
        req.user,
        req.body
    );

    res.status(200).json({
        success: true,
        message: "Profil mis à jour avec succès.",
        data,
    });
};

/**
 * Supprime le compte du locataire authentifié.
 *
 * @async
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const deleteLocataire = async (req, res) => {
    await locataireService.deleteLocataire(
        req.user,
        req.body
    );

    res.clearCookie("token");

    res.status(204).send();
};

module.exports = {
    getDataLocataire,
    getProfilLocataire,
    updateLocataire,
    deleteLocataire,
};