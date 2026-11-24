const cron = require('node-cron');
const { db, admin } = require('../../config/firebase');
const { notifyTenantsForListing } = require('../../notifications/alertDelivery');

const TZ = 'Africa/Douala';
const LOCK_MAX_MS = 5 * 60 * 1000;
let runningSince = 0;

// Accepte Timestamp Firestore, Date, nombre (ms) ou chaîne.
// Une chaîne avec heure mais sans fuseau est interprétée en heure de Douala (+01:00).
function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    let s = value.trim().replace(' ', 'T');
    if (/T\d/.test(s) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(s)) s += '+01:00';
    const d = new Date(s);
    return Number.isNaN(+d) ? null : d;
  }
  return null;
}

const logError = (label, error) =>
  console.error(label, error.code || error.name, '-', error.message);

async function publishOne(ref, now) {
  return db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    if (!current.exists) return null;
    const data = current.data();
    if (data.status !== 'programmee') return null;

    const publishAt = toDate(data.datePublication);
    if (!publishAt || publishAt > now) return null;

    const expireAt = toDate(data.dateExpiration);
    if (expireAt && expireAt <= now) {
      tx.update(ref, { status: 'expirer', estPubliee: false });
      return 'expired';
    }

    if (data.idPublic) {
      tx.set(db.collection('annonce_motscles').doc(data.idPublic), { status: 'publier' }, { merge: true });
    }
    tx.update(ref, {
      status: 'publier',
      estPubliee: true,
      publicationNotificationPending: true,
      updatedAt: admin.firestore.Timestamp.now(),
    });
    return 'published';
  });
}

async function publishDue(now = new Date()) {
  // Requête simple (un seul champ → pas d'index composite requis).
  // Le tri par date se fait en mémoire, quel que soit le type du champ datePublication.
  const scheduled = await db.collection('annonce')
    .where('status', '==', 'programmee')
    .limit(500)
    .get();

  const due = scheduled.docs.filter((doc) => {
    const d = toDate(doc.data().datePublication);
    return d && d <= now;
  });

  let published = 0;
  for (const doc of due) {
    try {
      const result = await publishOne(doc.ref, now);
      if (result === 'published') published++;
    } catch (error) {
      logError(`publication-failed ${doc.id}`, error); // une annonce en erreur ne bloque plus les autres
    }
  }
  if (published) console.log(`[publication-job] ${published} annonce(s) publiée(s)`);

  // Notifications en attente
  const pending = await db.collection('annonce')
    .where('publicationNotificationPending', '==', true)
    .limit(100)
    .get();

  for (const doc of pending.docs) {
    try {
      const claimed = await db.runTransaction(async (tx) => {
        const current = await tx.get(doc.ref);
        const data = current.data();
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
        logError('publication-notification', error);
      }
    } catch (error) {
      logError('publication-notification-claim', error);
    }
  }
}

function startPublicationJobs() {
  const run = async () => {
    // Le verrou expire après 5 min pour ne jamais rester bloqué
    if (runningSince && Date.now() - runningSince < LOCK_MAX_MS) return;
    runningSince = Date.now();
    try {
      try { await publishDue(); }
      catch (error) { logError('publication-job', error); }

      try { await require('../signalementMail.service').retryPending(); }
      catch (error) { logError('signalement-retry', error); }
    } finally {
      runningSince = 0;
    }
  };

  const task = cron.schedule('* * * * *', run, { timezone: TZ });
  void run();
  return task;
}

module.exports = { publishDue, startPublicationJobs };