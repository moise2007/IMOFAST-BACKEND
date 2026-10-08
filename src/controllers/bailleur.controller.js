const bailleurService = require("../services/ApiService/bailleur.service");

/**
 * Récupère les données du bailleur authentifié.
 *
 * @async
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const getDataBailleur = async (req, res) => {
    const data = await bailleurService.getDataBailleur(req.user);

    res.status(200).json({
        success: true,
        data,
    });
};

/**
 * Récupère les données nécessaires à l'accueil du bailleur.
 *
 * @async
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const getDataAccueilBailleur = async (req, res) => {
    const data = await bailleurService.getDataAccueilBailleur(req.user);

    res.status(200).json({
        success: true,
        data,
    });
};

/**
 * Récupère le profil public ou détaillé d'un bailleur.
 *
 * @async
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const getProfilBailleur = async (req, res) => {
    const data = await bailleurService.getProfilBailleur(req.params.id);

    res.status(200).json({
        success: true,
        data,
    });
};

/**
 * Met à jour les informations du bailleur authentifié.
 *
 * @async
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const updateDataBailleur = async (req, res) => {
    const data = await bailleurService.updateDataBailleur(
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
 * Supprime le compte du bailleur authentifié.
 *
 * @async
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const deleteBailleur = async (req, res) => {
    await bailleurService.deleteBailleur(
        req.user,
        req.body
    );

    res.clearCookie("token");

    res.status(204).send();
};

module.exports = {
    getDataBailleur,
    getDataAccueilBailleur,
    getProfilBailleur,
    updateDataBailleur,
    deleteBailleur,
};