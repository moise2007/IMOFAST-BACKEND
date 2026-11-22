const { db } = require('../config/firebase');
const count = async query => (await query.count().get()).data().count;
const rows = async query => (await query.get()).docs.map(d => d.data());
async function latestVisible(query, userId) {
  let cursor, result = [];
  do {
    const snapshot = await (cursor ? query.startAfter(cursor) : query).limit(50).get();
    result.push(...snapshot.docs.map(d => d.data()).filter(d => !d.delete?.[userId]));
    cursor = snapshot.docs.length === 50 ? snapshot.docs.at(-1) : null;
  } while (cursor && result.length < 5);
  return result.slice(0, 5);
}
async function getDashboardData(bailleurId, { start, previousStart, end }) {
  const range = (query, from, to) => query.where('createdAt', '>=', from).where('createdAt', '<', to);
  const biens = db.collection('bien').where('bailleurId', '==', bailleurId);
  const applications = db.collection('candidature').where('bailleurId', '==', bailleurId);
  const listings = await rows(db.collection('annonce').where('bailleurId', '==', bailleurId));
  // Legacy favourites do not contain bailleurId. Resolve the owner's listing IDs in bounded groups.
  const favouriteCounts = { total: 0, current: 0, previous: 0 };
  for (let i = 0; i < listings.length; i += 30) {
    const q = db.collection('favoris').where('annonceId', 'in', listings.slice(i, i + 30).map(a => a.idPublic));
    const [total, current, previous] = await Promise.all([count(q), count(range(q, start, end)), count(range(q, previousStart, start))]);
    favouriteCounts.total += total; favouriteCounts.current += current; favouriteCounts.previous += previous;
  }
  const [biensTotal, biensCurrent, biensPrevious, applicationsTotal, applicationsCurrent, applicationsPrevious, daily, conversations, candidatures] = await Promise.all([
    count(biens), count(range(biens, start, end)), count(range(biens, previousStart, start)),
    count(applications), count(range(applications, start, end)), count(range(applications, previousStart, start)),
    rows(db.collection('statistiques_bailleur').where('bailleurId', '==', bailleurId).where('date', '>=', require('../utils/statistics').dayKey(previousStart)).where('date', '<', require('../utils/statistics').dayKey(end))),
    latestVisible(db.collection('conversation').where('bailleurId', '==', bailleurId).orderBy('updatedAt', 'desc'), bailleurId),
    latestVisible(applications.orderBy('createdAt', 'desc'), bailleurId),
  ]);
  return { listings, daily, conversations, candidatures, counts: {
    biens: { total: biensTotal, current: biensCurrent, previous: biensPrevious },
    candidatures: { total: applicationsTotal, current: applicationsCurrent, previous: applicationsPrevious },
    favoris: favouriteCounts,
  } };
}
module.exports = { getDashboardData };

module.exports.populateOverview = async ({ meilleuresAnnonces, conversations, candidatures, listings }) => {
  const people = new Map();
  const person = id => {
    if (!id) return Promise.resolve(null);
    if (!people.has(id)) people.set(id, db.collection('locataire').where('idPublic', '==', id).limit(1).get().then(snapshot => {
      const p = snapshot.docs[0]?.data();
      return p ? { nom: p.nom, prenom: p.prenom, photoProfil: p.photoProfil } : null;
    }));
    return people.get(id);
  };
  await Promise.all([
    ...meilleuresAnnonces.map(async a => {
      const record = listings.find(l => l.idPublic === a.idPublic);
      a.status = record.status; a.loyer = record.loyer; a.devise = record.devise;
      const snapshot = await db.collection('bien').where('idPublic', '==', a.bienId).limit(1).get();
      const b = snapshot.docs[0]?.data();
      a.bien = b ? { images: b.images, photos: b.photos, localisation: b.localisation } : null;
    }),
    ...conversations.map(async c => { c.autreUser = await person(c.locataireId); }),
    ...candidatures.map(async c => { c.locataire = await person(c.locataireId); c.annonce = { titre: listings.find(l => l.idPublic === c.annonceId)?.titre }; }),
  ]);
};
