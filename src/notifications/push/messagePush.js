// Accept only browser push services: subscription endpoints are supplied by clients.
const {isRecipientConnected} = require("../realtime");

function isPushEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (["fcm.googleapis.com", "push.googleapis.com", "updates.push.services.mozilla.com",
        "push.services.mozilla.com", "web.push.apple.com"].includes(url.hostname) ||
       url.hostname.endsWith(".push.services.mozilla.com") || url.hostname.endsWith(".notify.windows.com") ||
       url.hostname.endsWith(".push.apple.com"));
  } catch { return false; }
}

async function notifyNewMessage({db, recipientRole, recipientId, conversationId, title, sender}, deliver = sendWebPush) {
  if (!recipientId || !conversationId || !["locataire", "bailleur"].includes(recipientRole)) return;
  if (isRecipientConnected(recipientId)) return;
  try {
    const result = await db.collection(recipientRole).where("idPublic", "==", recipientId).limit(1).get();
    const doc = result.docs[0];
    if (recipientRole === "locataire" && doc?.data().notificationsActivees === false) return;
    if (!doc || doc.data().notificationsActivees === false || doc.data().notificationPreferences?.message === false) return;
    const i18n = require('../../config/i18n.config');
    const t = i18n.getFixedT(doc.data().langue || 'fr', 'responses');
    await require('./subscriptions').deliverToSubscriptions({ db, doc, deliver, payload: {
      title: sender ? require('../messageTitle').messageNotificationTitle(sender, doc.data().langue || 'fr') : title || t('backend.push.messageTitle'), body: t('backend.push.messageBody'),
      url: '/' + recipientRole + '/messagerie/' + encodeURIComponent(conversationId),
    } });
  } catch (error) {
    // Delivery is best effort; never log the subscription or fail a saved message.
    console.warn("Notification de message non distribuée", error.statusCode ?? error.code ?? "push");
  }
}
function sendWebPush(subscription, payload) {
  const {webpush} = require("../../config/webPush");
  return webpush.sendNotification(subscription, payload, {TTL: 86400, timeout: 10000});
}
module.exports = {notifyNewMessage, isPushEndpoint};
