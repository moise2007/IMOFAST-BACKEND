const { subscriptionsOf } = require('../../utils/notificationPreferences');
// Use an injected sender/database in tests; production uses the existing web-push config.
async function deliverToSubscriptions({ db, doc, payload, deliver }) {
  const { isPushEndpoint } = require('./messagePush');
  const user = doc.data();
  for (const subscription of subscriptionsOf(user)) {
    if (!isPushEndpoint(subscription.endpoint)) continue;
    try { await deliver(subscription, JSON.stringify(payload)); }
    catch (error) {
      if (![404, 410].includes(error.statusCode)) continue;
      await db.runTransaction(async tx => {
        const current = await tx.get(doc.ref);
        if (!current.exists && !current.data()) return;
        const data = current.data();
        const patch = {};
        if (Array.isArray(data.notifications)) patch.notifications = data.notifications.filter(s =>
          s.endpoint !== subscription.endpoint || JSON.stringify(s.keys) !== JSON.stringify(subscription.keys));
        if (data.notification?.web?.endpoint === subscription.endpoint &&
            JSON.stringify(data.notification.web.keys) === JSON.stringify(subscription.keys)) patch['notification.web'] = null;
        if (Object.keys(patch).length) tx.update(doc.ref, patch);
      });
    }
  }
}
module.exports = { deliverToSubscriptions };
