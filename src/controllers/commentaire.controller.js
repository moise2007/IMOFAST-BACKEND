const { asyncHandler } = require("../utils/asyncHandler");

const commentaireService = require("../services/ApiService/commentaire.service");

/**
 * Crée un commentaire.
 */
const createCommentaire = asyncHandler(async (req, res) => {
  const commentaire =
    await commentaireService.createCommentaire({
      data: req.validatedBody,
      user: req.user,
      role: req.role,
    });

  return res.status(201).json({
    success: true,
    commentaire,
    msg: req.t("success.commentaire_created", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère les commentaires d'une cible.
 */
const getCommentaires = asyncHandler(async (req, res) => {
  const result =
    await commentaireService.getCommentaires({
      ...req.validatedParams,
      ...req.validatedQuery,
    });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.commentaire_get", {
      ns: "responses",
    }),
  });
});

/**
 * Modifie un commentaire.
 */
const updateCommentaire = asyncHandler(async (req, res) => {
  const commentaire =
    await commentaireService.updateCommentaire({
      idPublic: req.validatedParams.id,
      message: req.validatedBody.message,
      user: req.user,
      role: req.role,
    });

  return res.status(200).json({
    success: true,
    commentaire,
    msg: req.t("success.commentaire_updated", {
      ns: "responses",
    }),
  });
});

/**
 * Supprime un commentaire.
 */
const deleteCommentaire = asyncHandler(async (req, res) => {
  await commentaireService.deleteCommentaire({
    idPublic: req.validatedParams.id,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    msg: req.t("success.commentaire_deleted", {
      ns: "responses",
    }),
  });
});

/**
 * Répond à un commentaire.
 */
const respondToCommentaire = asyncHandler(async (req, res) => {
  const result =
    await commentaireService.respondToCommentaire({
      idPublic: req.validatedParams.id,
      message: req.validatedBody.message,
      user: req.user,
      role: req.role,
    });

  return res.status(200).json({
    success: true,
    commentaire: result.commentaire,
    reponse: result.reponse,
    msg: req.t("success.commentaire_response", {
      ns: "responses",
    }),
  });
});

module.exports = {
  createCommentaire,
  getCommentaires,
  updateCommentaire,
  deleteCommentaire,
  respondToCommentaire,
};