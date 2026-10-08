const { asyncHandler } = require("../utils/asyncHandler");

const batimentService = require("../services/ApiService/batiment.service");

/**
 * Crée un bâtiment.
 */
const createBatiment = asyncHandler(async (req, res) => {
  const batiment = await batimentService.createBatiment({
    data: req.body,
    user: req.user,
    role: req.role,
  });

  return res.status(201).json({
    success: true,
    batiment,
    message: "Bâtiment créé avec succès",
  });
});

/**
 * Récupère la liste des bâtiments.
 */
const getBatiments = asyncHandler(async (req, res) => {
  const result = await batimentService.getBatiments({
    filters: req.validatedQuery,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: "Bâtiments chargés avec succès",
  });
});

/**
 * Récupère un bâtiment.
 */
const getBatiment = asyncHandler(async (req, res) => {
  const batiment = await batimentService.getBatiment({
    id: req.validatedParams.id,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    batiment,
    message: "Bâtiment chargé avec succès",
  });
});

/**
 * Modifie un bâtiment.
 */
const updateBatiment = asyncHandler(async (req, res) => {
  const batiment = await batimentService.updateBatiment({
    id: req.validatedParams.id,
    data: req.body,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    batiment,
    message: "Bâtiment modifié avec succès",
  });
});

/**
 * Supprime logiquement un bâtiment.
 */
const deleteBatiment = asyncHandler(async (req, res) => {
  await batimentService.deleteBatiment({
    id: req.validatedParams.id,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    message: "Bâtiment supprimé avec succès",
  });
});

module.exports = {
  createBatiment,
  getBatiments,
  getBatiment,
  updateBatiment,
  deleteBatiment,
};