// annonce.controller.js

const { asyncHandler } = require("../utils/asyncHandler");
const annonceService = require("../services/ApiService/annonce.service");
const rechercheAnnonceService = require("../services/ApiService/rechercheAnnonce.service");

const createAnnonceBailleur = asyncHandler(async (req, res) => {
    console.log("la procedure de creation d'annonce a commencer")
    console.log(req.body)
    const annonce = await annonceService.createAnnonce({
        data: req.body,
        user: req.user,
        role: req.role ?? req.user.role,
    });

    console.log("annonce creer avec success")

    return res.status(201).json({
        success: true,
        annonce,
        message: req.t("success.create_annonce", {
            ns: "responses",
        }),
    });
});

const getAnnonces = asyncHandler(async (req, res) => {
  const result = await annonceService.getAnnonces({
    filters: req.validatedQuery,
    user: req.user,
    role: req.role,
  });
  await rechercheAnnonceService.saveSearch({
    filters: req.validatedQuery,
    user: req.user,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    ...result,
    message: req.t("success.get_all_annonce", {
      ns: "responses",
    }),
  });
});

const getRecherchesRecentes = asyncHandler(async (req, res) => {
  const recherches = await rechercheAnnonceService.recentSearches(req.user);
  return res.status(200).json({ success: true, recherches });
});

const getAnnonce = asyncHandler(async (req, res) => {
    const annonce = await annonceService.getAnnonce({
        id: req.validatedParams.id,
        user: req.user,
        role: req.role,
    });

    return res.status(200).json({
        success: true,
        annonce,
        message: req.t("success.load_one_annonce", {
            ns: "responses",
        }),
    });
});

const updateAnnonceBailleur = asyncHandler(async (req, res) => {
    const annonce = await annonceService.updateAnnonce({
        id: req.validatedParams.id,
        data: req.body,
        user: req.user,
        role: req.role,
    });

    return res.status(200).json({
        success: true,
        annonce,
        message: req.t("success.update_annonce", {
            ns: "responses",
        }),
    });
});

const deleteAnnonceBailleur = asyncHandler(async (req, res) => {
    await annonceService.deleteAnnonce({
        id: req.validatedParams.id,
        user: req.user,
        role: req.role,
    });

    return res.status(200).json({
        success: true,
        message: req.t("success.delete_annonce", {
            ns: "responses",
        }),
    });
});

const getSelections = asyncHandler(async (req, res) => res.json({ success: true,
  ...await require('../services/ApiService/selection-annonce.service').getSelections() }));
module.exports = {
    getSelections,
    createAnnonceBailleur,
    getAnnonces,
    getRecherchesRecentes,
    getAnnonce,
    updateAnnonceBailleur,
    deleteAnnonceBailleur,
};
