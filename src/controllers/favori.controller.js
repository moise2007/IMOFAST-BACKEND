const { asyncHandler } = require("../utils/asyncHandler");
const favoriService = require("../services/ApiService/favori.service");

/**
 * Ajoute une annonce aux favoris du locataire.
 *
 * @route POST /favoris/:id
 */
const createFavori = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  const favori = await favoriService.createFavori({
    annonceId: id,
    locataireId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    msg: req.t("success.add_favori", {
      ns: "responses",
    }),
    favori,
  });
});

/**
 * Supprime un favori.
 *
 * @route DELETE /favoris/:id
 */
const deleteFavori = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  await favoriService.deleteFavori({
    favoriId: id,
    locataireId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    msg: req.t("success.remove_favori", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère les favoris du locataire connecté.
 *
 * @route GET /favoris
 */
const getFavoris = asyncHandler(async (req, res) => {
  const { page, limit } = req.validatedQuery;

  const result = await favoriService.getFavoris({
    locataireId: req.user.idPublic,
    page,
    limit,
  });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.get_favoris", {
      ns: "responses",
    }),
  });
});

module.exports = {
  createFavori,
  deleteFavori,
  getFavoris,
};