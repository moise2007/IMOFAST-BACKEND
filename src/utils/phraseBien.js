const TITRE_PAR_DEFAUT = "Annonce immobilière";

const GENRES = {
  bureau: "m", boutique: "f", terrain: "m", logement: "m",
  chambre: "f", studio: "m", appartement: "m", duplex: "m", maison: "f", villa: "f",
};

const NATURES = {
  simple: ["simple", "simple"],
  moderne: ["moderne", "moderne"],
  meuble: ["meublé", "meublée"],
  meubler: ["meublé", "meublée"],
};

const VENTE = ["vente", "vendre", "a vendre", "à vendre"];
const LOCATION = ["location", "louer", "a louer", "à louer"];

const cle = (s) =>
  String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const propre = (s) => String(s ?? "").trim();
const formaterPrix = (prix, devise) =>
  `${new Intl.NumberFormat("fr-FR").format(prix).replace(/[\u202f\u00a0]/g, " ")} ${devise}`;
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function phraseBien({
  typeBien, type, nature, ville, quartier, transaction, prix, devise, duree,
  titreParDefaut = TITRE_PAR_DEFAUT,
} = {}) {
  const estLogement = cle(typeBien) === "logement";
  const base = estLogement ? cle(type) || "logement" : cle(typeBien);
  if (!base) return titreParDefaut;

  const feminin = (GENRES[base] ?? "m") === "f";
  const article = feminin ? "une" : "un";

  const formes = estLogement ? NATURES[cle(nature)] : null;
  const natureTexte = formes ? ` ${formes[feminin ? 1 : 0]}` : "";

  const t = cle(transaction);
  const vente = VENTE.map(cle).includes(t);
  const location = LOCATION.map(cle).includes(t);
  const actionTexte = vente ? " à vendre" : location ? " à louer" : "";

  const lieu = [quartier, ville].map(propre).filter(Boolean).join(", ");
  const localisation = lieu ? `, ${feminin ? "située" : "situé"} à ${lieu}` : "";

  let prixTexte = "";
  const montant = prix === null || prix === undefined || prix === "" ? NaN : Number(prix);
  if ((vente || location) && Number.isFinite(montant) && montant > 0) {
    const texte = formaterPrix(montant, propre(devise) || "XAF");
    if (vente) prixTexte = `, au prix de ${texte}`;
    else {
      const d = propre(duree).toLowerCase();
      prixTexte = `, pour ${texte}${d ? ` par ${d}` : ""}`;
    }
  }

  return majuscule(`${article} ${base}${natureTexte}${actionTexte}${localisation}${prixTexte}.`);
}

module.exports = { phraseBien };