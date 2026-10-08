const { asyncHandler } = require("../utils/asyncHandler");
const signalementService = require("../services/ApiService/signalement.service");

/**
 * Crée un signalement.
 *
 * @route POST /signalements
 */
const createSignalement = asyncHandler(async (req, res) => {
  const signalement =
    await signalementService.createSignalement({
      data: req.validatedBody,
      user: req.user,
    });

  return res.status(201).json({
    success: true,
    signalement,
    msg: req.t("success.create_signalement", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère les signalements selon les filtres.
 *
 * @route GET /signalements
 */
const getSignalements = asyncHandler(async (req, res) => {
  const result =
    await signalementService.getSignalements({
      filters: req.validatedQuery,
      user: req.user,
      role: req.role,
    });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.get_signalement", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère un signalement par son identifiant public.
 *
 * @route GET /signalements/:id
 */
const getSignalement = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  const signalement =
    await signalementService.getSignalement({
      idPublic: id,
      user: req.user,
      role: req.role,
    });

  return res.status(200).json({
    success: true,
    signalement,
  });
});

/**
 * Modifie un signalement.
 *
 * @route PATCH /signalements/:id
 */
const updateSignalement = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  const signalement =
    await signalementService.updateSignalement({
      idPublic: id,
      data: req.validatedBody,
      user: req.user,
    });

  return res.status(200).json({
    success: true,
    signalement,
    msg: req.t("success.update_signalement", {
      ns: "responses",
    }),
  });
});

/**
 * Supprime un signalement.
 *
 * @route DELETE /signalements/:id
 */
const deleteSignalement = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  await signalementService.deleteSignalement({
    idPublic: id,
    user: req.user,
  });

  return res.status(200).json({
    success: true,
    msg: req.t("success.delete_signalement", {
      ns: "responses",
    }),
  });
});

module.exports = {
  createSignalement,
  getSignalements,
  getSignalement,
  updateSignalement,
  deleteSignalement,
};