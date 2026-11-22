const i18next = require("../config/i18n.config");
const { webpush } = require("../config/webPush");
const { Users } = require("./auto/usersGetting");
const notificationService = require("./ApiService/notification.service");
const { emitNotification } = require("../notifications/realtime");

async function createNotification({ destinataireId, typeDestinataire, type, cibleId, typeCible, titre, message, titreKey, messageKey, values = {}, eventKey, lang = "fr" }) {
  try {
    const { db } = require('../config/firebase');
    const snapshot = await db.collection(typeDestinataire).where('idPublic', '==', destinataireId).limit(1).get();
    const doc = snapshot.docs[0];
    if (!doc) return { success: true, skipped: true };
    const recipient = doc.data();
    if (recipient.notificationsActivees === false || recipient.notificationPreferences?.[type] === false)
      return { success: true, skipped: true };
    const t = i18next.getFixedT(recipient.langue || lang, 'responses');
    if (titreKey) titre = t(titreKey, values);
    if (messageKey) message = t(messageKey, values);
    const data = { destinataireId, typeDestinataire, type, cibleId, typeCible, titre, message };
    let notification;
    if (eventKey) {
      const result = await notificationService.createNotificationOnce({ data, eventKey });
      if (!result.created) return { success: true, notification: result.notification, duplicate: true };
      notification = result.notification;
    } else notification = await notificationService.createNotification({ data });
    emitNotification(notification);
    if (type !== 'message') await require('../notifications/push/subscriptions').deliverToSubscriptions({ db, doc,
      deliver: (subscription, payload) => webpush.sendNotification(subscription, payload, { TTL: 86400, timeout: 10000 }),
      payload: { title: titre, body: message, url: typeCible === 'annonce' ? `/annonce/${encodeURIComponent(cibleId)}` : `/${typeDestinataire}/notifications` },
    });
    return { success: true, notification };
  } catch (error) {
    console.error("Création de notification :", error);
    return { success: false, msg: i18next.t("server_error", { lng: lang, ns: "errors" }) };
  }
}

async function sendNotification(title, description, url) {
  try {
    const payload = JSON.stringify({
      title,
      body: description,
      icon: "https://imofast.org/logo.png",
      badge: "https://imofast.org/logo.png",
      url,
    });
    const subscriptions = Users.COMPTE_CACHE.bailleur?.map((user) => user?.notificationData).filter(Boolean);
    await Promise.all((subscriptions ?? []).map((subscription) => webpush.sendNotification(subscription, payload)));
    return true;
  } catch (error) {
    console.error("Envoi de notification push :", error);
    return false;
  }
}

module.exports = { createNotification, sendNotification };
