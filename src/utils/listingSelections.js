const { DAY_MS, dayStart } = require('./statistics');
const WEIGHTS = Object.freeze({ vues: 1, commentaires: 3, favoris: 5 });
function listingScore(annonce) {
  return Object.entries(WEIGHTS).reduce((score, [key, weight]) => score + Math.max(0, Number(annonce.statistiques?.[key]) || 0) * weight, 0);
}
function selectionWindows(now = new Date()) {
  const local = new Date(+now + 3600000);
  const monday = new Date(+dayStart(now) - ((local.getUTCDay() + 6) % 7) * DAY_MS);
  const month = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - 3600000);
  return { weekStart: new Date(+monday - 7 * DAY_MS), weekEnd: monday, monthStart: month, monthEnd: now };
}
function compareListings(a, b) { return listingScore(b) - listingScore(a) || a.idPublic.localeCompare(b.idPublic); }
module.exports = { WEIGHTS, listingScore, selectionWindows, compareListings };
