const repository = require('../../repositories/dashboard.repository');
const { DAY_MS, dayStart, dayKey, evolution } = require('../../utils/statistics');
const { calculerCompletudeBailleur } = require('../../utils/completudeProfil/completudeProfil.bailleur.utils');

async function getDashboard({ user, days = 7, now = new Date() }) {
  const end = new Date(+dayStart(now) + DAY_MS);
  const start = new Date(+end - days * DAY_MS);
  const previousStart = new Date(+start - days * DAY_MS);

  const { listings, daily, conversations, candidatures, counts } =
    await repository.getDashboardData(user.idPublic, { start, previousStart, end });

  // Vues : somme des stats par jour (plusieurs documents possibles pour un même jour)
  const viewsByDate = new Map();
  for (const d of daily) {
    viewsByDate.set(d.date, (viewsByDate.get(d.date) || 0) + (d.vues || 0));
  }
  const startKey = dayKey(start);
  const views = {
    total: listings.reduce((sum, a) => sum + (a.statistiques?.vues || 0), 0),
    current: 0,
    previous: 0,
  };
  for (const [date, vues] of viewsByDate) {
    views[date >= startKey ? 'current' : 'previous'] += vues;
  }
  counts.vues = views;

  const cartes = Object.fromEntries(
    Object.entries(counts).map(([key, c]) => [key, {
      total: c.total,
      periodeCourante: c.current,
      periodePrecedente: c.previous,
      evolution: evolution(c.current, c.previous),
    }]),
  );

  const vuesHebdomadaires = Array.from({ length: 7 }, (_, i) => {
    const date = dayKey(new Date(+end - (7 - i) * DAY_MS));
    return { date, vues: viewsByDate.get(date) || 0 };
  });

  const stat = (a, k) => a.statistiques?.[k] || 0;
  const meilleuresAnnonces = [...listings]
    .sort((a, b) =>
      stat(b, 'candidatures') - stat(a, 'candidatures') ||
      stat(b, 'vues') - stat(a, 'vues') ||
      String(a.idPublic).localeCompare(String(b.idPublic)))
    .slice(0, 4)
    .map((a) => ({
      idPublic: a.idPublic,
      titre: a.titre,
      bienId: a.bienId,
      vues: stat(a, 'vues'),
      favoris: stat(a, 'favoris'),
      candidatures: stat(a, 'candidatures'),
      commentaires: stat(a, 'commentaires'),
    }));

  const completion = calculerCompletudeBailleur({
    ...user,
    activite: { ...user.activite, bien: counts.biens.total, annoncesTotal: listings.length },
  });

  await repository.populateOverview({ meilleuresAnnonces, conversations, candidatures, listings });

  return {
    totalAnnonces: listings.length,
    cartes,
    vuesHebdomadaires,
    meilleuresAnnonces,
    conversations,
    candidatures,
    completudeProfil: {
      pourcentage: completion.pourcentage,
      champsManquants: completion.manquants.map((m) => m.cle),
    },
    periode: {
      debut: start.toISOString(),
      finExclusive: end.toISOString(),
      jours: days,
      fuseau: 'Africa/Douala',
    },
  };
}

module.exports = { getDashboard };