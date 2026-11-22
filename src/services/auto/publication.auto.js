const cron = require('node-cron');
const { db, admin } = require('../../config/firebase');
const { notifyTenantsForListing } = require('../../notifications/alertDelivery');
let running = false;
async function publishDue(now = new Date()) {
  const due = await db.collection('annonce').where('status', '==', 'programmee')
    .where('datePublication', '<=', now.toISOString()).orderBy('datePublication').limit(100).get();
  for (const doc of due.docs) {
    await db.runTransaction(async tx => {
      const current = await tx.get(doc.ref), data = current.data();
      if (!current.exists || data.status !== 'programmee' || +new Date(data.datePublication) > +now) return;
      if (data.dateExpiration && +new Date(data.dateExpiration) <= +now) {
        tx.update(doc.ref, { status: 'expirer', estPubliee: false }); return;
      }
      tx.set(db.collection("annonce_motscles").doc(data.idPublic), { status: "publier" }, { merge: true });
      tx.update(doc.ref, { status: 'publier', estPubliee: true, publicationNotificationPending: true,
        updatedAt: admin.firestore.Timestamp.now() });
    });
  }
  const pending = await db.collection('annonce').where('publicationNotificationPending', '==', true).limit(100).get();
  for (const doc of pending.docs) {
    const claimed = await db.runTransaction(async tx => {
      const current = await tx.get(doc.ref), data = current.data();
      if (!data?.publicationNotificationPending || (data.notificationLeaseUntil || 0) > Date.now()) return null;
      tx.update(doc.ref, { notificationLeaseUntil: Date.now() + 10 * 60000 });
      return data;
    });
    if (!claimed) continue;
    try {
      await notifyTenantsForListing(claimed);
      await doc.ref.update({ publicationNotificationPending: false, notificationLeaseUntil: 0 });
    } catch (error) {
      await doc.ref.update({ notificationLeaseUntil: 0 });
      console.error('publication-notification', error.code || error.name);
    }
  }
}
function startPublicationJobs() {
  const run = async () => {
    if (running) return;
    running = true;
    try { await publishDue(); await require('../signalementMail.service').retryPending(); }
    catch (error) { console.error('publication-job', error.code || error.name); }
    finally { running = false; }
  };
  const task = cron.schedule('* * * * *', run, { timezone: 'Africa/Douala' });
  void run();
  return task;
}
module.exports = { publishDue, startPublicationJobs };
