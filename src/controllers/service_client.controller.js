const { asyncHandler } = require("../utils/asyncHandler");

const serviceClientService = require("../services/ApiService/service_client.service");

/**
 * Récupère les demandes de l'utilisateur.
 */
const getDemandes = asyncHandler(async (req, res) => {
    const result =
        await serviceClientService.getDemandes({
            userId: req.user.idPublic,
            filters: req.validatedQuery,
        });

    return res.status(200).json({
        success: true,
        ...result,
        msg: req.t("responses:backend.support.loaded"),
    });
});

/**
 * Récupère une demande spécifique.
 */
const getDemande = asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { type } = req.validatedQuery;

    const demande =
        await serviceClientService.getDemande({
            id,
            type,
            userId: req.user.idPublic,
        });

    return res.status(200).json({
        success: true,
        demande,
    });
});

/**
 * Envoie un message au service client.
 */
const createMessage = asyncHandler(async (req, res) => {
    const message =
        await serviceClientService.createMessage({
            data: req.validatedBody,
            user: req.user,
            role: req.role,
        });

    return res.status(201).json({
        success: true,
        message,
        msg: req.t("responses:backend.support.messageReceived"),
    });
});

/**
 * Crée une réclamation.
 */
const createReclamation = asyncHandler(async (req, res) => {
    const reclamation =
        await serviceClientService.createReclamation({
            data: req.validatedBody,
            user: req.user,
            role: req.role,
        });

    return res.status(201).json({
        success: true,
        reclamation,
        msg: req.t("responses:backend.support.claimReceived"),
    });
});

/**
 * Crée un signalement.
 */
const createSignalement = asyncHandler(async (req, res) => {
    const signalement =
        await serviceClientService.createSignalement({
            data: req.validatedBody,
            user: req.user,
            role: req.role,
        });

    return res.status(201).json({
        success: true,
        signalement,
        msg: req.t("responses:backend.support.reportReceived"),
    });
});

module.exports = {
    getContacts: asyncHandler(async (req, res) => res.json({ success: true, contacts: await serviceClientService.getContacts() })),
    getDemandes,
    getDemande,
    createMessage,
    createReclamation,
    createSignalement,
};