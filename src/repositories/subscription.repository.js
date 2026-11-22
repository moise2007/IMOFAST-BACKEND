const { db } = require('../config/firebase');
const { DEFAULT_NOTIFICATION_PREFERENCES, subscriptionsOf } = require('../utils/notificationPreferences');
const AppError = require('../errors/AppError');
async function updateSubscriptions({ role, userId, subscription, endpoint }) {
  const ref = db.collection(role).doc(userId);
  return db.runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new AppError('errors:backend.notFound', 404);
    const user = doc.data();
    const target = subscription?.endpoint ?? endpoint;
    const subscriptions = subscriptionsOf(user).filter(s => s.endpoint !== target);
    if (subscription) subscriptions.push(subscription);
    const patch = { notifications: subscriptions, 'notification.web': null };
    if (subscription) {
      patch.notificationsActivees = true;
      patch.notificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...user.notificationPreferences };
    }
    tx.update(ref, patch);
    return { appareils: subscriptions.length };
  });
}
async function setPreferences({ role, userId, preferences }) {
  const ref = db.collection(role).doc(userId);
  return db.runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new AppError('errors:backend.notFound', 404);
    const result = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...doc.data().notificationPreferences, ...preferences };
    tx.update(ref, { notificationPreferences: result });
    return result;
  });
}
module.exports = { updateSubscriptions, setPreferences };
