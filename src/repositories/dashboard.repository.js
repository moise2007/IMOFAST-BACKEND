const { db } = require('../config/firebase');
const { dayKey } = require('../utils/statistics');

const count = async (query) => (await query.count().get()).data().count;
const rows = async (query) => (await query.get()).docs.map((d) => d.data());
const range = (query, from, to) =>
  query.where('createdAt', '>=', from).where('createdAt', '<', to);

async function latestVisible(query, userId) {
  const PAGE = 50;
  let cursor = null;
  const result = [];
  do {
    const snapshot = await (cursor ? query.startAfter(cursor) : query).limit(PAGE).get();
    result.push(...snapshot.docs.map((d) => d.data()).filter((d) => !d.delete?.[userId]));
    cursor = snapshot.docs.length === PAGE ? snapshot.docs.at(-1) : null;
  } while (cursor && result.length < 5);
  return result.slice(0, 5);
}

async function getDashboardData(bailleurId, { start, previousStart, end }) {
  const biens = db.collection('bien').where('bailleurId', '==', bailleurId);
  const applications = db.collection('candidature').where('bailleurId', '==', bailleurId);

  const listings = await rows(db.collection('annonce').where('bailleurId', '==', bailleurId));

  // Les anciens favoris n'ont pas de bailleurId : on passe par les ids d'annonces (max 30 par "in")
  const listingIds = listings.map((a) => a.idPublic).filter(Boolean);
  const favoris = { total: 0, current: 0, previous: 0 };
  for (let i = 0; i < listingIds.length; i += 30) {
    const q = db.collection('favoris').where('annonceId', 'in', listingIds.slice(i, i + 30));
    const [total, current, previous] = await Promise.all([
      count(q),
      count(range(q, start, end)),
      count(range(q, previousStart, start)),
    ]);
    favoris.total += total;
    favoris.current += current;
    favoris.previous += previous;
  }

  const [
    biensTotal, biensCurrent, biensPrevious,
    appsTotal, appsCurrent, appsPrevious,
    daily, conversations, candidatures,
  ] = await Promise.all([
    count(biens),
    count(range(biens, start, end)),
    count(range(biens, previousStart, start)),
    count(applications),
    count(range(applications, start, end)),
    count(range(applications, previousStart, start)),
    rows(
      db.collection('statistiques_bailleur')
        .where('bailleurId', '==', bailleurId)
        .where('date', '>=', dayKey(previousStart))
        .where('date', '<', dayKey(end)),
    ),
    latestVisible(
      db.collection('conversation')
        .where('bailleurId', '==', bailleurId)
        .orderBy('updatedAt', 'desc'),
      bailleurId,
    ),
    latestVisible(applications.orderBy('createdAt', 'desc'), bailleurId),
  ]);

  return {
    listings,
    daily,
    conversations,
    candidatures,
    counts: {
      biens: { total: biensTotal, current: biensCurrent, previous: biensPrevious },
      candidatures: { total: appsTotal, current: appsCurrent, previous: appsPrevious },
      favoris,
    },
  };
}

async function populateOverview({ meilleuresAnnonces, conversations, candidatures, listings }) {
  const people = new Map();
  const biensCache = new Map();

  const findOne = async (collection, idPublic) => {
    const snapshot = await db.collection(collection).where('idPublic', '==', idPublic).limit(1).get();
    return snapshot.docs[0]?.data() ?? null;
  };

  const person = (id) => {
    if (!id) return Promise.resolve(null);
    if (!people.has(id)) {
      people.set(id, findOne('locataire', id).then((p) =>
        p ? { nom: p.nom, prenom: p.prenom, photoProfil: p.photoProfil } : null));
    }
    return people.get(id);
  };

  const bien = (id) => {
    if (!id) return Promise.resolve(null);
    if (!biensCache.has(id)) {
      biensCache.set(id, findOne('bien', id).then((b) =>
        b ? { images: b.images, photos: b.photos, localisation: b.localisation } : null));
    }
    return biensCache.get(id);
  };

  const listingById = new Map(listings.map((l) => [l.idPublic, l]));

  await Promise.all([
    ...meilleuresAnnonces.map(async (a) => {
      const record = listingById.get(a.idPublic) || {};
      a.status = record.status;
      a.loyer = record.loyer;
      a.devise = record.devise;
      a.bien = await bien(a.bienId);
    }),
    ...conversations.map(async (c) => {
      c.autreUser = await person(c.locataireId);
    }),
    ...candidatures.map(async (c) => {
      c.locataire = await person(c.locataireId);
      c.annonce = { titre: listingById.get(c.annonceId)?.titre };
    }),
  ]);
}

module.exports = { getDashboardData, populateOverview };