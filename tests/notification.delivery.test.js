const test = require('node:test');
const assert = require('node:assert/strict');
const { database } = require('./helpers/backendHarness.cjs');
const web = id => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, keys: { auth: 'secret', p256dh: 'key' } });
test('notifications reach every device, respect preferences, and clean up only expired subscriptions', async () => {
  const h = database({ 'locataire/u': { idPublic: 'u', langue: 'en', notifications: [web('ok'), web('gone'), web('temporarily-down')] } });
  const delivered = [], emitted = [];
  const service = h.load('services/notification.service.js', {
    'config/webPush.js': { webpush: { sendNotification: async (sub, payload) => {
      delivered.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
      if (sub.endpoint.endsWith('/gone')) throw { statusCode: 410 };
      if (sub.endpoint.endsWith('/temporarily-down')) throw { statusCode: 503 };
    } } },
    'services/auto/usersGetting.js': { Users: { COMPTE_CACHE: {} } },
    'notifications/realtime.js': { emitNotification: n => emitted.push(n), isRecipientConnected: () => false },
  });
  const result = await service.createNotification({ destinataireId: 'u', typeDestinataire: 'locataire', type: 'annonce', cibleId: 'a', typeCible: 'annonce',
    titreKey: 'backend.push.listingTitle', messageKey: 'backend.push.listingBody', values: { titre: 'Studio' } });
  assert.equal(result.success, true);
  assert.equal(emitted.length, 1);
  assert.equal(delivered.length, 3);
  assert.equal(delivered[0].payload.title, 'New listing');
  assert.equal(h.records.get('locataire/u').notifications.length, 2);
  h.records.get('locataire/u').notificationPreferences = { annonce: false };
  assert.equal((await service.createNotification({ destinataireId: 'u', typeDestinataire: 'locataire', type: 'annonce' })).skipped, true);
  assert.equal(delivered.length, 3);
});
test('new publications and tenant alerts notify the whole active target role', async () => {
  const h = database({
    'locataire/a': { idPublic: 'a', status: 'actif' }, 'locataire/b': { idPublic: 'b', status: 'actif' },
    'bailleur/c': { idPublic: 'c', status: 'actif' }, 'bailleur/d': { idPublic: 'd', status: 'suspendus' },
  });
  const deliveries = [];
  const service = h.load('notifications/alertDelivery.js', { 'services/notification.service.js': { createNotification: async data => { deliveries.push(data); return { success: true }; } } });
  await service.notifyTenantsForListing({ idPublic: 'listing', status: 'publier', titre: 'Studio' });
  await service.notifyOwnersForAlert({ idPublic: 'alert', role: 'locataire', ville: 'Douala' });
  assert.deepEqual(deliveries.map(n => n.destinataireId), ['a', 'b', 'c']);
  await service.notifyTenantsForListing({ idPublic: 'draft', status: 'brouillon' });
  assert.equal(deliveries.length, 3);
});
