const { asyncHandler } = require("../utils/asyncHandler");
const candidatureService = require("../services/ApiService/candidature.service");

/**
 * Crée une candidature.
 */
const createCandidature = asyncHandler(async (req, res) => {
  const result = await candidatureService.createCandidature({
    data: req.validatedBody,
    user: req.user,
    role: req.role,
    t: req.t,
  });

  return res.status(result.forfait ? 200 : 201).json({
    success: !result.forfait,
    candidature: result.candidature ?? null,
    forfait: result.forfait ?? false,
    msg:
      result.msg ??
      req.t("success.candidature_created", {
        ns: "responses",
      }),
  });
});

/**
 * Récupère la liste des candidatures.
 */
const getCandidatures = asyncHandler(async (req, res) => {
  const result = await candidatureService.getCandidatures({
    filters: req.validatedQuery,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.get_candidature", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère le détail d'une candidature.
 */
const getCandidature = asyncHandler(async (req, res) => {
  const candidature = await candidatureService.getCandidature({
    idPublic: req.validatedParams.id,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    candidature,
    msg: req.t("success.loaded_candidature", {
      ns: "responses",
    }),
  });
});

/**
 * Accepte une candidature.
 */
const acceptCandidature = asyncHandler(async (req, res) => {
  const candidature = await candidatureService.acceptCandidature({
    idPublic: req.validatedParams.id,
    bailleurId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    candidature,
    msg: req.t("success.candidature_created", {
      ns: "responses",
    }),
  });
});

/**
 * Refuse une candidature.
 */
const refuseCandidature = asyncHandler(async (req, res) => {
  const candidature = await candidatureService.refuseCandidature({
    idPublic: req.validatedParams.id,
    bailleurId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    candidature,
    msg: req.t("success.delete_candidature", {
      ns: "responses",
    }),
  });
});

/**
 * Annule une candidature.
 */
const cancelCandidature = asyncHandler(async (req, res) => {
  const candidature = await candidatureService.cancelCandidature({
    idPublic: req.validatedParams.id,
    userId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    candidature,
    msg: req.t("success.delete_candidature", {
      ns: "responses",
    }),
  });
});

/**
 * Programme ou reprogramme une visite.
 */
const programmerCandidature = asyncHandler(async (req, res) => {
  const candidature =
    await candidatureService.programmerCandidature({
      idPublic: req.validatedParams.id,
      bailleurId: req.user.idPublic,
      date: req.validatedBody.date,
      time: req.validatedBody.time,
    });

  return res.status(200).json({
    success: true,
    candidature,
    msg: req.t("success.update_candidature", {
      ns: "responses",
    }),
  });
});

/**
 * Modifie une candidature.
 */
const updateCandidature = asyncHandler(async (req, res) => {
  const candidature =
    await candidatureService.updateCandidature({
      idPublic: req.validatedParams.id,
      data: req.validatedBody,
      locataireId: req.user.idPublic,
      user: req.user,
      role: req.role,
      t: req.t,
    });

  return res.status(200).json({
    success: true,
    candidature,
    msg: req.t("success.update_candidature", {
      ns: "responses",
    }),
  });
});

/**
 * Supprime logiquement une candidature.
 */
const deleteCandidature = asyncHandler(async (req, res) => {
  await candidatureService.deleteCandidature({
    idPublic: req.validatedParams.id,
    userId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    msg: req.t("success.delete_candidature", {
      ns: "responses",
    }),
  });
});

module.exports = {
  createCandidature,
  getCandidatures,
  getCandidature,
  acceptCandidature,
  refuseCandidature,
  cancelCandidature,
  programmerCandidature,
  updateCandidature,
  deleteCandidature,
};