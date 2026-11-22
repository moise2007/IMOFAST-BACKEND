const { db, admin } = require('../config/firebase');
const AppError = require('../errors/AppError');
const { normalize, tokens, buildKeywordRecord, matchesFilters, keywordScore } = require('../utils/annonceKeywords');
const COLLECTION = 'annonce_motscles';
const MAX_CANDIDATES = 2000;
const ANCHORS = ['bailleurId', 'quartier', 'ville', 'typeBien', 'type', 'nature', 'natureAnnonce', 'devise'];
function writeIndex(writer, annonce, bien) {
  writer.set(db.collection(COLLECTION).doc(annonce.idPublic), buildKeywordRecord(annonce, bien));
}
async function reindexListing(idPublic) {
  return db.runTransaction(async tx => {
    const found = await tx.get(db.collection('annonce').where('idPublic', '==', idPublic).limit(1));
    const annonce = found.docs[0]?.data();
    if (!annonce) { tx.delete(db.collection(COLLECTION).doc(idPublic)); return; }
    const biens = await tx.get(db.collection('bien').where('idPublic', '==', annonce.bienId).limit(1));
    writeIndex(tx, annonce, biens.docs[0]?.data() || {});
  });
}
async function reindexProperty(bienId) {
  const annonces = await db.collection('annonce').where('bienId', '==', bienId).get();
  for (const doc of annonces.docs) await reindexListing(doc.data().idPublic);
}
async function search({ criteres, page, limit }) {
  const words = tokens(criteres.search || criteres.titre || '', 8);
  if ((criteres.search || criteres.titre) && !words.length) throw new AppError('errors:backend.searchWords', 400);
  let query = db.collection(COLLECTION);
  if (criteres.status) query = query.where('status', '==', criteres.status);
  if (words.length) query = query.where('prefixes', 'array-contains-any', words);
  const anchor = ANCHORS.find(key => criteres[key] != null && criteres[key] !== '');
  if (anchor) query = query.where(anchor, '==', ['ville', 'quartier'].includes(anchor) ? normalize(criteres[anchor]) : criteres[anchor]);
  // Read only matching indexed rows, never all listings. A broad query must be refined instead of returning an incomplete ranking.
  const snapshot = await query.select('annonceId', 'mots', 'bailleurId', 'status', 'typeBien', 'type', 'nature', 'natureAnnonce', 'ville', 'quartier', 'devise', 'loyer', 'minPrix', 'nombreChambre', 'nombreDouche', 'createdAt')
    .limit(MAX_CANDIDATES + 1).get();
  if (snapshot.docs.length > MAX_CANDIDATES) throw new AppError('errors:backend.searchTooBroad', 422, { maxCandidates: MAX_CANDIDATES });
  const candidates = snapshot.docs.map(d => d.data()).filter(record => typeof record.annonceId === 'string' && Array.isArray(record.mots) && Array.isArray(record.loyer) && matchesFilters(record, criteres));
  const rows = [];
  for (let i = 0; i < candidates.length; i += 30) {
    const group = candidates.slice(i, i + 30);
    const found = await db.collection('annonce').where('idPublic', 'in', group.map(r => r.annonceId)).get();
    for (const doc of found.docs) {
      const annonce = doc.data();
      if (criteres.status && annonce.status !== criteres.status) continue;
      if (annonce.status === 'publier' && (annonce.estPubliee === false || (annonce.dateExpiration && +new Date(annonce.dateExpiration) <= Date.now()))) continue;
      const record = group.find(r => r.annonceId === annonce.idPublic);
      rows.push({ ...annonce, scoreRecherche: keywordScore(record, words), _prix: record.minPrix });
    }
  }
  const millis = date => (date?.toMillis?.() ?? (date?._seconds ? date._seconds * 1000 : +new Date(date))) || 0;
  rows.sort((a, b) => {
    if (words.length && a.scoreRecherche !== b.scoreRecherche) return b.scoreRecherche - a.scoreRecherche;
    if (criteres.sort === 'prixCroissant') return a._prix - b._prix || a.idPublic.localeCompare(b.idPublic);
    if (criteres.sort === 'prixDecroissant') return b._prix - a._prix || a.idPublic.localeCompare(b.idPublic);
    if (criteres.sort === 'populaire') return (b.statistiques?.vues || 0) - (a.statistiques?.vues || 0) || a.idPublic.localeCompare(b.idPublic);
    return millis(b.createdAt) - millis(a.createdAt) || a.idPublic.localeCompare(b.idPublic);
  });
  return { totalItems: rows.length, annonces: rows.slice((page - 1) * limit, page * limit).map(({ _prix, ...annonce }) => annonce) };
}
module.exports = { writeIndex, reindexListing, reindexProperty, search, ANCHORS, MAX_CANDIDATES };
