const { createHash } = require('node:crypto');
const { db, admin } = require('../../config/firebase');
const AppError = require('../../errors/AppError');
const { dayKey } = require('../../utils/statistics');
async function recordAnnonceView({ id, type = 'profonde', user, anonymousId, now = new Date() }) {
  const identity = user?.idPublic || anonymousId;
  if (!identity) throw new AppError('errors:backend.invalidInput', 400);
  const snapshot = await db.collection('annonce').where('idPublic', '==', id).limit(1).get();
  if (snapshot.empty) throw new AppError('errors:backend.notFound', 404);
  const ref = snapshot.docs[0].ref;
  const date = dayKey(now);
  const key = `${identity}_${date}`;
  const receipt = ref.collection('consultations').doc(key);
  return db.runTransaction(async tx => {
    const [current, previous] = await Promise.all([tx.get(ref), tx.get(receipt)]);
    const annonce = current.data();
    if (!current.exists || annonce.status !== 'publier' || annonce.estPubliee === false || (annonce.dateExpiration && +new Date(annonce.dateExpiration) <= +now))
      throw new AppError('errors:backend.notFound', 404);
    if (annonce.bailleurId === user?.idPublic) return false;
    if (previous.exists && previous.data().types?.includes(type)) return false;
    const changes = { [`vues.${type}`]: admin.firestore.FieldValue.increment(1) };
    const other = type === 'simple' ? 'profonde' : 'simple';
    if (annonce.vues?.[other] == null) changes[`vues.${other}`] = 0;
    if (!previous.exists) {
      changes['statistiques.vues'] = admin.firestore.FieldValue.increment(1);
      changes[`vuesParJour.${date}`] = admin.firestore.FieldValue.increment(1);
      const daily = db.collection('statistiques_bailleur').doc(`${annonce.bailleurId}_${date}`);
      tx.set(daily, { bailleurId: annonce.bailleurId, date, vues: admin.firestore.FieldValue.increment(1) }, { merge: true });
    }
    tx.update(ref, changes);
    tx.set(receipt, { cle: key, recordedAt: +now, types: [...(previous.data()?.types || []), type] });
    return !previous.exists;
  });
}

async function recordAlerteViewer(id, userId) {
  const ref = db.collection('alerte').doc(id);
  const key = createHash('sha256').update(userId).digest('hex');
  const viewer = ref.collection('lecteurs').doc(key);
  return db.runTransaction(async tx => {
    const [alert, seen] = await Promise.all([tx.get(ref), tx.get(viewer)]);
    if (!alert.exists) throw new AppError('errors:alerte.notFound', 404);
    const count = alert.data().nombreBailleursVus ?? 0;
    if (seen.exists) return count;
    tx.set(viewer, { seenAt: admin.firestore.Timestamp.now() });
    tx.update(ref, { nombreBailleursVus: admin.firestore.FieldValue.increment(1) });
    return count + 1;
  });
}
module.exports = { recordAnnonceView, recordAlerteViewer };
