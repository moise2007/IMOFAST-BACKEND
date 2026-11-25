const express = require("express");
// ⚠️ Adapte le chemin et le nom du fichier du repository des annonces
const annonceRepository = require("../repositories/annonce.repository");
const { phraseBien } = require("../utils/phraseBien");

const routerSeo = express.Router();

const SITE_URL = "https://imofast.org";
const DEFAULT_TITLE = "ImoFast | Trouvez votre logement au Cameroun";
const DEFAULT_DESCRIPTION =
  "Trouvez des studios, chambres, appartements, duplex et villas à louer ou à vendre au Cameroun.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const clean = (text, max) => {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

const isHttpUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);

const renderHtml = ({ title, description, image, pageUrl }) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:site_name" content="ImoFast">
<meta property="og:locale" content="fr_CM">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(pageUrl)}">
</head>
<body><a href="${esc(pageUrl)}">${esc(title)}</a></body>
</html>`;

routerSeo.get("/annonces/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const pageUrl = `${SITE_URL}/annonces/${encodeURIComponent(id)}`;

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let image = DEFAULT_IMAGE;

  try {
    // 1. L'annonce
    const annonce = await annonceRepository.findByIdPublic(id);

    // Seules les annonces publiées sont exposées
    if (annonce) {
      // 2. Le bien, grâce à annonce.bienId
      const bien = await annonceRepository.findBienById(annonce.bienId);

      const phrase = phraseBien({
        typeBien: bien?.typeBien,
        type: bien?.type ?? null,
        nature: bien?.nature ?? null,
        ville: bien?.localisation?.ville,
        quartier: bien?.localisation?.quartier,
        transaction: annonce?.nature,
        prix: annonce?.nature == "location" ? annonce?.loyer[0]?.prix ?? null : annonce?.loyer?.prix,
        devise: "XAF",
        titreParDefaut: annonce.titre,
        duree: annonce?.nature == "location" ? annonce?.loyer[0]?.duree ?? null : null,
    })

      title = clean(phrase, 100);
      description = clean(annonce.description, 160) || DEFAULT_DESCRIPTION;

      const first = bien?.images?.[0] ?? bien?.photos?.[0];
      if (isHttpUrl(first)) image = first;
    }
  } catch (error) {
    console.error("seo-annonce", error.code || error.name, "-", error.message);
  }

  res
    .status(200)
    .set("Content-Type", "text/html; charset=utf-8")
    .set("Cache-Control", "public, max-age=300")
    .send(renderHtml({ title, description, image, pageUrl }));
});

module.exports = { routerSeo };