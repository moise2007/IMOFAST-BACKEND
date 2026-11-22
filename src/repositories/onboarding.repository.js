const { db, admin } = require('../config/firebase');
const AppError = require('../errors/AppError');
const STEPS = ['bien', 'annonce', 'notifications', 'alertes', 'termine'];
async function get(userId) {
  const doc = await db.collection('bailleur').doc(userId).get();
  if (!doc.exists) throw new AppError('errors:backend.notFound', 404);
  return doc.data().onboarding || { etape: 'bien', termine: false };
}
async function advance({ userId, etape }) {
  const ref = db.collection('bailleur').doc(userId);
  return db.runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new AppError('errors:backend.notFound', 404);
    const user = doc.data();
    const current = user.onboarding || { etape: 'bien', termine: false };
    if (current.etape !== etape || current.termine) throw new AppError('errors:backend.onboardingOrder', 409);
    let ready = false;
    if (etape === 'bien') ready = !(await tx.get(db.collection('bien').where('bailleurId', '==', user.idPublic).limit(1))).empty;
    if (etape === 'annonce') ready = !(await tx.get(db.collection('annonce').where('bailleurId', '==', user.idPublic).where('status', 'in', ['publier', 'programmee']).limit(1))).empty;
    if (etape === 'notifications') ready = require('../utils/notificationPreferences').subscriptionsOf(user).length > 0;
    if (etape === 'alertes') ready = current.alertesConsultees === true;
    if (!ready) throw new AppError('errors:backend.onboardingIncomplete', 409);
    const next = STEPS[STEPS.indexOf(etape) + 1];
    const onboarding = { ...current, etape: next, termine: next === 'termine', updatedAt: admin.firestore.Timestamp.now() };
    tx.update(ref, { onboarding });
    return onboarding;
  });
}
async function markAlertsSeen(userId) {
  const ref = db.collection('bailleur').doc(userId);
  await db.runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (doc.data()?.onboarding?.etape === 'alertes') tx.update(ref, { 'onboarding.alertesConsultees': true });
  });
}
module.exports = { get, advance, markAlertsSeen, STEPS };
