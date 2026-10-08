const {asyncHandler} = require("../utils/asyncHandler");
const alerteService = require("../services/ApiService/alerte.service");

const createAlerte = asyncHandler(async (req, res) => {
  const alerte = await alerteService.createAlerte({
    data: req.body,
    user: req.user,
    role: req.role,
  });

  return res.status(201).json({
    success: true,
    alerte,
    message:
      "votre alerte a été publiée avec succès, les bailleurs intéressés vous contacteront via la messagerie",
  });
});

const getAlertes = asyncHandler(async (req, res) => {
  const { alertes, pagination } = await alerteService.getAlertes({
    filters: req.validatedQuery,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    alertes,
    pagination,
    message: "les alertes ont été chargées avec succès.",
  });
});

const deleteAlerte = asyncHandler(async (req, res) => {
  await alerteService.deleteAlerte({
    id: req.validatedParams.id,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    message: "l'alerte a été supprimée avec succès",
  });
});

const getAlerte = asyncHandler(async (req, res) => {
  const alerte = await alerteService.getAlerte({
    id: req.validatedParams.id,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    alerte,
    message: "l'alerte a été chargée avec succès.",
  });
});



const updateAlerte = asyncHandler(async (req, res) => {
  const alerte = await alerteService.updateAlerte({
    id: req.validatedParams.id,
    data: req.body,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    alerte,
    message: "l'alerte a été modifiée avec succès",
  });
});

module.exports = { createAlerte, getAlertes, getAlerte, updateAlerte, deleteAlerte };