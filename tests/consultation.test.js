const test = require('node:test');
const assert = require('node:assert/strict');
const { database } = require('./helpers/backendHarness.cjs');
function harness() {
  return database({ 'annonce/a': { idPublic: 'a', bailleurId: 'owner', status: 'publier', estPubliee: true }, 'alerte/a': { auteurId: 'tenant' } });
}
test('daily views are unique across concurrent requests and view types in Douala', async () => {
  const h = harness(), service = h.load('services/metrics/consultation.service.js');
  const request = { id: 'a', type: 'simple', user: { idPublic: 'tenant' }, now: new Date('2026-11-20T22:59:00Z') };
  const results = await Promise.all(Array.from({ length: 10 }, () => service.recordAnnonceView(request)));
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(await service.recordAnnonceView({ ...request, type: 'profonde' }), false);
  assert.equal(h.records.get('annonce/a').statistiques.vues, 1);
  assert.equal(h.records.get('annonce/a').vues.profonde, 1);
  assert.ok(h.records.has('annonce/a/consultations/tenant_2026-11-20'));
  assert.equal(await service.recordAnnonceView({ ...request, now: new Date('2026-11-20T23:00:00Z') }), true);
  assert.equal(h.records.get('annonce/a').statistiques.vues, 2);
  assert.equal(h.records.get('statistiques_bailleur/owner_2026-11-21').vues, 1);
  assert.equal(await service.recordAnnonceView({ ...request, user: { idPublic: 'owner' } }), false);
  const visitor = { ...request, user: null, anonymousId: 'anon_123' };
  assert.equal(await service.recordAnnonceView(visitor), true);
  assert.equal(await service.recordAnnonceView(visitor), false);
  h.records.get('annonce/a').estPubliee = false;
  await assert.rejects(service.recordAnnonceView(request), { statusCode: 404 });
});
test('alert readers count distinct landlords only, including concurrent reads', async () => {
  const h = harness(), service = h.load('services/metrics/consultation.service.js');
  await Promise.all(Array.from({ length: 5 }, () => service.recordAlerteViewer('a', 'owner')));
  assert.equal(h.records.get('alerte/a').nombreBailleursVus, 1);
  assert.equal(await service.recordAlerteViewer('a', 'other'), 2);
});
