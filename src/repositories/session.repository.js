const { db } = require('../config/firebase');
const { createHash, randomBytes } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
const expiry = value => value?.toMillis?.() ?? ((value?.seconds ?? value?._seconds) != null ? (value.seconds ?? value._seconds) * 1000 : +new Date(value));
async function findSession(id) {
  const doc = await db.collection('session').doc(id).get();
  if (!doc.exists || !Number.isFinite(expiry(doc.data().expireAt)) || expiry(doc.data().expireAt) <= Date.now()) return null;
  return { id: doc.id, ...doc.data() };
}
async function findUser(session) {
  if (!session || !['bailleur', 'locataire', 'admin'].includes(session.role)) return null;
  const doc = await db.collection(session.role).doc(session.userId).get();
  if (!doc.exists) return null;
  const user = { ...doc.data(), id: doc.id, role: session.role };
  if (session.role !== 'admin') {
    const patch = {};
    if (user.status === 'suspendus' && user.finSuspension && expiry(user.finSuspension) <= Date.now()) {
      patch.status = 'actif'; patch.finSuspension = null; user.status = 'actif'; user.finSuspension = null;
    }
    if (user.forfait?.fin && expiry(user.forfait.fin) <= Date.now()) {
      patch['forfait.type'] = 'aucun'; patch['forfait.fin'] = null;
      user.forfait = { ...user.forfait, type: 'aucun', fin: null };
    }
    if (Object.keys(patch).length) await doc.ref.update(patch);
  }
  return user;
}
async function rotateRefresh(token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 512) return null;
  const digest = hash(token);
  const result = await db.collection('session').where('refreshHash', '==', digest).limit(1).get();
  const ref = result.docs[0]?.ref;
  if (!ref) return null;
  return db.runTransaction(async tx => {
    const doc = await tx.get(ref), data = doc.data();
    if (!doc.exists || data.refreshHash !== digest || !Number.isFinite(expiry(data.expireAt)) || expiry(data.expireAt) <= Date.now()) return null;
    if (!['bailleur', 'locataire', 'admin'].includes(data.role)) return null;
    const user = await tx.get(db.collection(data.role).doc(data.userId));
    const account = user.data();
    const suspensionExpired = account?.status === 'suspendus' && account.finSuspension && expiry(account.finSuspension) <= Date.now();
    if (!user.exists || (data.role === 'admin' ? account.active !== true : account.status !== 'actif' && !suspensionExpired)) return null;
    if (suspensionExpired) tx.update(user.ref, { status: 'actif', finSuspension: null });
    const refreshToken = randomBytes(48).toString('hex');
    tx.update(ref, { refreshHash: hash(refreshToken), expireAt: new Date(Date.now() + 30 * 86400000) });
    return { session: { ...data, id: doc.id }, refreshToken };
  });
}
module.exports = { findSession, findUser, rotateRefresh, expiry };
