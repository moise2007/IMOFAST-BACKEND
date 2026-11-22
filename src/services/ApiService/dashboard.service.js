const repository = require('../../repositories/dashboard.repository');
const { DAY_MS, dayStart, dayKey, evolution } = require('../../utils/statistics');
const { calculerCompletudeBailleur } = require('../../utils/completudeProfil/completudeProfil.bailleur.utils');
async function getDashboard({ user, days = 7, now = new Date() }) {
  const end = new Date(+dayStart(now) + DAY_MS);
  const start = new Date(+end - days * DAY_MS);
  const previousStart = new Date(+start - days * DAY_MS);
  const { listings, daily, conversations, candidatures, counts } = await repository.getDashboardData(user.idPublic, { start, previousStart, end });
  const views = { total: listings.reduce((sum, a) => sum + (a.statistiques?.vues || 0), 0), current: 0, previous: 0 };
  for (const d of daily) views[d.date >= dayKey(start) ? 'current' : 'previous'] += d.vues || 0;
  counts.vues = views;
  const cartes = Object.fromEntries(Object.entries(counts).map(([key, c]) => [key, {
    total: c.total, periodeCourante: c.current, periodePrecedente: c.previous, evolution: evolution(c.current, c.previous),
  }]));
  const vuesHebdomadaires = Array.from({ length: 7 }, (_, i) => {
    const date = dayKey(new Date(+end - (7 - i) * DAY_MS));
    return { date, vues: daily.find(d => d.date === date)?.vues || 0 };
  });
  const meilleuresAnnonces = listings.sort((a, b) =>
    (b.statistiques?.candidatures || 0) - (a.statistiques?.candidatures || 0) ||
    (b.statistiques?.vues || 0) - (a.statistiques?.vues || 0) || a.idPublic.localeCompare(b.idPublic))
    .slice(0, 4).map(a => ({ idPublic: a.idPublic, titre: a.titre, bienId: a.bienId,
      ...Object.fromEntries(['vues', 'favoris', 'candidatures', 'commentaires'].map(k => [k, a.statistiques?.[k] || 0])) }));
  const completion = calculerCompletudeBailleur({ ...user, activite: { ...user.activite, bien: counts.biens.total, annoncesTotal: listings.length } });
  await repository.populateOverview({ meilleuresAnnonces, conversations, candidatures, listings });
  return { totalAnnonces: listings.length, cartes, vuesHebdomadaires, meilleuresAnnonces, conversations, candidatures,
    completudeProfil: { pourcentage: completion.pourcentage, champsManquants: completion.manquants.map(m => m.cle) },
    periode: { debut: start.toISOString(), finExclusive: end.toISOString(), jours: days, fuseau: 'Africa/Douala' } };
}
module.exports = { getDashboard };
