const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
// Fixed weights: budget 60, property type 25, neighbourhood 15. Missing criteria earn no points.
function calculerNoteCandidature(locataire, annonce, bien = {}) {
  const preferences = locataire.preferences || {};
  const prices = (Array.isArray(annonce.loyer) ? annonce.loyer : [annonce.loyer]).map(p => Number(p?.prix)).filter(p => Number.isFinite(p) && p > 0);
  const price = prices.length ? Math.min(...prices) : Number(annonce.recherche?.minPrix);
  const budget = Number(preferences.maxBudget);
  let score = Number.isFinite(price) && price > 0 && budget > 0 && (!locataire.devise || locataire.devise === annonce.devise)
    ? 60 * Math.min(1, budget / price) : 0;
  const type = normalize(preferences.typeBien || preferences.typeLogement);
  if (type && (type === 'all' || type === normalize(bien.typeBien) || type === normalize(bien.type))) score += 25;
  const quartier = normalize(preferences.quartier);
  if (quartier && (quartier === 'all' || quartier === normalize(bien.localisation?.quartier || bien.localisation?.quatier))) score += 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}
function appointmentDate(visite = {}) {
  const { dateSouhaitee, heureSouhaitee } = visite;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateSouhaitee || "")) {
    return null;
  }

  const heure = heureSouhaitee || "00:00";

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) {
    return null;
  }

  const date = new Date(`${dateSouhaitee}T${heure}:00+01:00`);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  // Vérification de la date réelle (ex: éviter le 31 février)
  const [year, month, day] = dateSouhaitee.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}
module.exports = { calculerNoteCandidature, appointmentDate };
