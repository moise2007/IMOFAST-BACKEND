const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  annonce: true, alerte: true, commentaire: true, candidature: true,
  message: true, conversation: true, favoris: true, note: true,
});
function subscriptionsOf(user = {}) {
  const subscriptions = [...(Array.isArray(user.notifications) ? user.notifications : [])];
  if (user.notification?.web) subscriptions.push(user.notification.web);
  return [...new Map(subscriptions.filter(s => s?.endpoint).map(s => [s.endpoint, s])).values()];
}
module.exports = { DEFAULT_NOTIFICATION_PREFERENCES, subscriptionsOf };
