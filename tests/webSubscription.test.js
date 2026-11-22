const test = require('node:test');
const assert = require('node:assert/strict');
const { database } = require('./helpers/backendHarness.cjs');
const web = id => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, keys: { auth: 'a'.repeat(22), p256dh: 'b'.repeat(87) } });
test('concurrent subscription registration retains all devices and deduplicates endpoints', async () => {
  const h = database({ 'bailleur/u': { idPublic: 'u', notification: { web: web('old'), mobile: 'mobile' } } });
  const repository = h.load('repositories/subscription.repository.js');
  await Promise.all(['one', 'two', 'one'].map(id => repository.updateSubscriptions({ role: 'bailleur', userId: 'u', subscription: web(id) })));
  const user = h.records.get('bailleur/u');
  assert.deepEqual(user.notifications.map(s => s.endpoint).sort(), ['old', 'one', 'two'].map(id => web(id).endpoint).sort());
  assert.equal(user.notification.mobile, 'mobile');
  assert.equal(user.notification.web, null);
  assert.equal(user.notificationPreferences.annonce, true);
  await repository.setPreferences({ role: 'bailleur', userId: 'u', preferences: { annonce: false } });
  await repository.updateSubscriptions({ role: 'bailleur', userId: 'u', subscription: web('three') });
  assert.equal(h.records.get('bailleur/u').notificationPreferences.annonce, false);
  await repository.updateSubscriptions({ role: 'bailleur', userId: 'u', endpoint: web('one').endpoint });
  assert.equal(h.records.get('bailleur/u').notifications.length, 3);
});
test('subscription cannot be registered for a different account', async () => {
  const h = database({ 'locataire/u': { idPublic: 'u' } });
  const service = h.load('services/ApiService/notification.service.js');
  await assert.rejects(service.subscribe({ role: 'locataire', user: { id: 'u', idPublic: 'u' }, account: 'locataire:other', web: web('one') }), { statusCode: 409 });
  assert.equal(h.records.get('locataire/u').notifications, undefined);
});
