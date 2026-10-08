const { asyncHandler } = require("../utils/asyncHandler");

const bienService = require("../services/ApiService/bien.service");

/**
 * Crée un bien.
 */
const createBienBailleur = asyncHandler(async (req, res) => {
  const result = await bienService.createBien({
    data: req.body,
    user: req.user,
    role: req.role,
    t: req.t,
  });

  return res.status(201).json({
    success: true,
    ...result,
    message: req.t("success.create_bien", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère la liste des biens.
 */
const getAllBien = asyncHandler(async (req, res) => {
  const result = await bienService.getBiens({
    filters: req.validatedQuery,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: req.t("success.get_all_bien", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère le détail d'un bien.
 */
const getDetailBien = asyncHandler(async (req, res) => {
  const bien = await bienService.getBien({
    id: req.validatedParams.id,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    bien,
    message: req.t("success.load_one_bien", {
      ns: "responses",
    }),
  });
});

/**
 * Modifie un bien.
 */
const updateBienBailleur = asyncHandler(async (req, res) => {
  const bien = await bienService.updateBien({
    id: req.validatedParams.id,
    data: req.body,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    bien,
    message: req.t("success.update_bien", {
      ns: "responses",
    }),
  });
});

/**
 * Supprime un bien.
 */
const deleteBienBailleur = asyncHandler(async (req, res) => {
  await bienService.deleteBien({
    id: req.validatedParams.id,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    message: req.t("success.delete_bien", {
      ns: "responses",
    }),
  });
});

module.exports = {
  createBienBailleur,
  getAllBien,
  getDetailBien,
  updateBienBailleur,
  deleteBienBailleur,
};