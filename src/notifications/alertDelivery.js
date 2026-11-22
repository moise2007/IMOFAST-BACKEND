const { db, admin } = require('../config/firebase');
const { createNotification } = require('../services/notification.service');
async function broadcast(role, data) {
  let cursor;
  do {
    let query = db.collection(role).orderBy(admin.firestore.FieldPath.documentId()).limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      const user = doc.data();
      if (user.idPublic && user.status === 'actif') {
        const result = await createNotification({ ...data, destinataireId: user.idPublic, typeDestinataire: role });
        if (!result.success) throw new Error('notification-persistence-failed');
      }
    }
    cursor = page.docs.length === 100 ? page.docs.at(-1) : null;
  } while (cursor);
}
async function notifyTenantsForListing(annonce) {
  if (annonce.status !== 'publier' || annonce.estPubliee === false) return;
  return broadcast('locataire', { eventKey: `publication:${annonce.idPublic}:${annonce.datePublication || ''}`, type: 'annonce', cibleId: annonce.idPublic, typeCible: 'annonce',
    titreKey: 'backend.push.listingTitle', messageKey: 'backend.push.listingBody', values: { titre: annonce.titre } });
}
async function notifyOwnersForAlert(alert) {
  if (alert.role !== 'locataire' || alert.actif === false) return;
  return broadcast('bailleur', { type: 'alerte', cibleId: alert.idPublic, typeCible: 'alerte',
    titreKey: 'backend.push.alertTitle', messageKey: 'backend.push.alertBody', values: { ville: alert.ville } });
}
module.exports = { notifyTenantsForListing, notifyOwnersForAlert };
