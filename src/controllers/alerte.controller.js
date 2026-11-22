const { asyncHandler: handleAsync } = require("../utils/asyncHandler");
// Translate operational alert errors using the language of this request.
const asyncHandler = (handler) => handleAsync(async (req, res, next) => {
  try { return await handler(req, res, next); }
  catch (error) {
    if (error.message.startsWith("errors:alerte.")) error.message = req.t(error.message);
    throw error;
  }
});
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
      req.t("responses:alerte.created"),
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
    message: req.t("responses:alerte.loaded"),
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
    message: req.t("responses:alerte.deleted"),
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
    message: req.t("responses:alerte.read"),
  });
});



const respondToAlert = asyncHandler(async (req, res) => res.json({ success: true,
  ...await alerteService.respondToAlert({ id: req.validatedParams.id, user: req.user, role: req.role }) }));
module.exports = { respondToAlert, createAlerte, getAlertes, getAlerte, deleteAlerte };