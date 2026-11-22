const repository = require("../../repositories/ownerHome.repository");
const { calculerCompletudeBailleur } = require("../../utils/completudeProfil/completudeProfil.bailleur.utils");
const time = value => value?.toMillis?.() ?? (value?._seconds != null ? value._seconds * 1000 : new Date(value).getTime());
const change = (current, previous) => previous > 0 ? Math.round((current - previous) / previous * 100) : current === 0 ? 0 : null;
function buildOverview(data, profile, now = Date.now()) {
  const { annonces, biens, demandes, conversations, favorites = [] } = data;
  const week = 7 * 86400000;
  const start = new Date(now); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  const boundary = start.getTime();
  const growth = rows => change(rows.filter(r => time(r.createdAt) >= boundary).length,
    rows.filter(r => time(r.createdAt) >= boundary - week && time(r.createdAt) < boundary).length);
  const viewsByDay = {};
  for (const a of annonces) for (const [day, count] of Object.entries(a.vuesParJour ?? {})) viewsByDay[day] = (viewsByDay[day] ?? 0) + count;
  const weeklyViews = Array.from({ length: 8 }, (_, i) => {
    const from = boundary - (7 - i) * week;
    return { week: new Date(from).toISOString().slice(0, 10), views: Object.entries(viewsByDay).reduce((sum, [day, n]) => time(day) >= from && time(day) < from + week ? sum + n : sum, 0) };
  });
  const completude = calculerCompletudeBailleur(profile);
  return {
    statistiques: {
      totalAnnonce: annonces.length, totalBien: biens.length, totalDemande: demandes.length,
      vues: annonces.reduce((sum, a) => sum + (a.statistiques?.vues ?? 0), 0), favoris: favorites.length,
      evolution: { biens: growth(biens), candidatures: growth(demandes), favoris: growth(favorites), vues: Object.keys(viewsByDay).length ? change(weeklyViews[7].views, weeklyViews[6].views) : null },
    },
    weeklyViews: Object.keys(viewsByDay).length ? weeklyViews : [],
    annonces: [...annonces].sort((a, b) => (b.statistiques?.candidatures ?? 0) - (a.statistiques?.candidatures ?? 0) || (b.statistiques?.vues ?? 0) - (a.statistiques?.vues ?? 0)).slice(0, 4).map(a => ({ ...a, bien: biens.find(b => b.idPublic === a.bienId) })),
    demandes: [...demandes].sort((a, b) => time(b.createdAt) - time(a.createdAt)).slice(0, 5).map(d => ({ ...d, annonce: { titre: annonces.find(a => a.idPublic === d.annonceId)?.titre } })),
    conversations: conversations.filter(c => c.delete?.[profile.idPublic] !== true).sort((a, b) => time(b.updatedAt) - time(a.updatedAt)).slice(0, 5),
    completude: { pourcentage: completude.pourcentage, manquants: completude.manquants.map(({ cle }) => ({ cle })) },
  };
}
async function load(profile) {
  const data = await repository.forOwner(profile.idPublic);
  data.favorites = await repository.favorites(data.annonces.map(a => a.idPublic));
  const overview = buildOverview(data, profile);
  const people = new Map();
  const person = id => { if (!people.has(id)) people.set(id, repository.person(id)); return people.get(id); };
  await Promise.all([
    ...overview.demandes.map(async d => { d.locataire = await person(d.locataireId); }),
    ...overview.conversations.map(async c => { c.autreUser = await person(c.locataireId); }),
  ]);
  return overview;
}
module.exports = { load, buildOverview, change };
