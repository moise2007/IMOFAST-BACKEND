const normalize = (value) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function prices(annonce) {
  return (Array.isArray(annonce?.loyer) ? annonce.loyer : [annonce?.loyer])
    .map((option) => Number(option?.prix ?? option))
    .filter((price) => Number.isFinite(price) && price >= 0);
}

function matchesAlert(alerte, annonce, bien) {
  if (!alerte || !annonce || !bien || alerte.actif === false || annonce.status !== "publier") return false;
  const same = (expected, actual) => !expected || normalize(expected) === normalize(actual);
  if (!same(alerte.ville, bien.localisation?.ville) || !same(alerte.quartier, bien.localisation?.quartier)) return false;
  if (!same(alerte.type, bien.type) || !same(alerte.nature, bien.nature) || !same(alerte.natureAnnonce, annonce.nature)) return false;
  if (alerte.nombreChambre != null && (!Number.isFinite(Number(bien.chambres?.nombre ?? bien.chambres)) || Number(bien.chambres?.nombre ?? bien.chambres) < alerte.nombreChambre)) return false;
  const min = alerte.prixMin ?? 0;
  const max = alerte.prixMax ?? alerte.prix ?? Infinity;
  return prices(annonce).some((price) => price >= min && price <= max);
}

function matchesPreferences(preferences, annonce, bien) {
  if (!preferences || annonce?.status !== "publier" || !bien) return false;
  const type = preferences.typeLogement ?? preferences.types;
  const district = preferences.quartier;
  const budget = Number(preferences.maxBudget);
  if ((!type || type === "all") && (!district || district === "all") && (!Number.isFinite(budget) || budget === 150000)) return false;
  if (preferences.typeBien && normalize(preferences.typeBien) !== normalize(bien.typeBien)) return false;
  if (type && type !== "all" && normalize(type) !== normalize(bien.type)) return false;
  if (district && district !== "all" && normalize(district) !== normalize(bien.localisation?.quartier)) return false;
  return prices(annonce).some((price) => !Number.isFinite(budget) || price <= budget);
}

module.exports = { matchesAlert, matchesPreferences };
