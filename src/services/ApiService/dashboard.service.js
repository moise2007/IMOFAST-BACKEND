const repository = require('../../repositories/dashboard.repository');
const { DAY_MS, dayStart, dayKey, evolution } = require('../../utils/statistics');
const { calculerCompletudeBailleur } = require('../../utils/completudeProfil/completudeProfil.bailleur.utils');

const YEAR_THRESHOLD_DAYS = 90; // au-delà, la série est regroupée par mois

function buildViewsSeries({ viewsByDate, days, end }) {
  // Jusqu'à 90 jours : un point par jour
  if (days <= YEAR_THRESHOLD_DAYS) {
    const series = Array.from({ length: days }, (_, i) => {
      const date = dayKey(new Date(+end - (days - i) * DAY_MS));
      return { date, views: viewsByDate.get(date) || 0 };
    });
    return { viewsSeries: series, granularity: 'day' };
  }

  // Au-delà : 12 derniers mois, un point par mois ("YYYY-MM")
  const byMonth = new Map();
  for (const [date, vues] of viewsByDate) {
    const month = date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) || 0) + vues);
  }

  const today = dayKey(new Date(+end - DAY_MS)); // dernier jour de la période (heure de Douala)
  const [year, month] = today.split('-').map(Number);

  const series = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (11 - i), 1));
    const key = d.toISOString().slice(0, 7);
    return { date: key, views: byMonth.get(key) || 0 };
  });

  return { viewsSeries: series, granularity: 'month' };
}

async function getDashboard({ user, days = 7, now = new Date() }) {
  const end = new Date(+dayStart(now) + DAY_MS);
  const start = new Date(+end - days * DAY_MS);
  const previousStart = new Date(+start - days * DAY_MS);

  const { listings, daily, conversations, candidatures, counts } =
    await repository.getDashboardData(user.idPublic, { start, previousStart, end });

  // Vues : somme par jour (plusieurs documents possibles pour une même date)
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

  const { viewsSeries, granularity } = buildViewsSeries({ viewsByDate, days, end });

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
    viewsSeries,          // [{ date: "2026-11-24" | "2026-11", views: 12 }, ...]
    granularity,          // "day" | "month"
    periodViews: views.current,
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