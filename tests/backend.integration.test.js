const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { database, Timestamp } = require('./helpers/backendHarness.cjs');

test('refresh rotation has one winner, rejects replay/revocation, and restores ended suspensions', async () => {
  const token = 'r'.repeat(96), hash = value => crypto.createHash('sha256').update(value).digest('hex');
  const h = database({
    'bailleur/u': { idPublic: 'owner', status: 'actif' },
    'session/s': { userId: 'u', role: 'bailleur', refreshHash: hash(token), expireAt: new Date(Date.now() + 3600000) },
  });
  process.env.JWT_SECRET = 'integration-test-local-secret';
  const repo = h.load('repositories/session.repository.js');
  const results = await Promise.all([repo.rotateRefresh(token), repo.rotateRefresh(token)]);
  assert.equal(results.filter(Boolean).length, 1);
  const rotated = results.find(Boolean);
  assert.notEqual(rotated.refreshToken, token);
  assert.equal(await repo.rotateRefresh(token), null);
  const service = h.load('services/ApiService/session.service.js');
  const accessToken = jwt.sign({ idsession: 's' }, process.env.JWT_SECRET);
  assert.equal((await service.resolveSession({ accessToken })).role, 'bailleur');
  h.records.get('bailleur/u').status = 'suspendus';
  assert.equal(await repo.rotateRefresh(rotated.refreshToken), null);
  h.records.get('bailleur/u').finSuspension = { seconds: Math.floor(Date.now() / 1000) - 60 };
  assert.ok(await repo.rotateRefresh(rotated.refreshToken));
  assert.equal(h.records.get('bailleur/u').status, 'actif');
  h.records.delete('session/s');
  assert.equal(await service.resolveSession({ accessToken }), null);
  assert.equal(await service.resolveSession({ accessToken: 'invalid' }), null);
});

test('refresh cookie covers me and refresh; all former paths are cleared on logout', () => {
  const h = database(), cookies = [], clears = [];
  const service = h.load('utils/session.js');
  const res = { cookie: (name, value, options) => cookies.push({ name, value, options }), clearCookie: (name, options) => clears.push({ name, options }) };
  service.writeSessionCookies(res, { accessToken: 'a', refreshToken: 'r' });
  assert.equal(cookies.find(c => c.name === 'refresh').options.path, '/api/auth');
  assert.ok(cookies.every(c => c.options.httpOnly && c.options.signed));
  service.clearSessionCookies(res);
  assert.ok(clears.some(c => c.name === 'refresh' && c.options.path === '/api/auth/refresh'));
  assert.ok(clears.some(c => c.name === 'refresh' && c.options.path === '/api/auth'));
});

test('scheduled publications are claimed once and retry a failed notification dispatch', async () => {
  const now = new Date(), earlier = new Date(+now - 1000).toISOString();
  const h = database({
    'annonce/a': { idPublic: 'a', status: 'programmee', datePublication: earlier },
    'annonce/b': { idPublic: 'b', status: 'programmee', datePublication: new Date(+now + 60000).toISOString() },
    'annonce/c': { idPublic: 'c', status: 'programmee', datePublication: earlier, dateExpiration: earlier },
  });
  let calls = 0, fail = true;
  const jobs = h.load('services/auto/publication.auto.js', { 'notifications/alertDelivery.js': { notifyTenantsForListing: async () => { calls++; if (fail) throw new Error('simulated'); } } });
  await jobs.publishDue(now);
  assert.equal(h.records.get('annonce/a').status, 'publier');
  assert.equal(h.records.get('annonce/a').publicationNotificationPending, true);
  assert.equal(h.records.get('annonce/b').status, 'programmee');
  assert.equal(h.records.get('annonce/c').status, 'expirer');
  fail = false;
  await Promise.all([jobs.publishDue(now), jobs.publishDue(now)]);
  assert.equal(calls, 2);
  assert.equal(h.records.get('annonce/a').publicationNotificationPending, false);
});

test('broadcast persistence is idempotent per publication and recipient', async () => {
  const h = database(), repo = h.load('repositories/notification.repository.js');
  const data = { idPublic: 'unused', destinataireId: 'tenant', typeDestinataire: 'locataire', titre: 'Title', createdAt: Timestamp.now() };
  const results = await Promise.all([repo.createOnce(data, 'publication:a:date'), repo.createOnce(data, 'publication:a:date')]);
  assert.equal(results.filter(r => r.created).length, 1);
  assert.equal(results[0].notification.idPublic, results[1].notification.idPublic);
  assert.equal(h.records.size, 1);
  await repo.createOnce({ ...data, destinataireId: 'other' }, 'publication:a:date');
  assert.equal(h.records.size, 2);
});

test('selection fallback is cached and concurrent readers share one calculation', async () => {
  const h = database();
  const Cache = h.load('cache/cache.js', { 'services/sendMailErrorProduction.service.js': { sendEmailToAlertError: async () => {} } });
  const cache = new Cache('test-only');
  let calls = 0;
  const service = h.load('services/ApiService/selection-annonce.service.js', {
    'cache/selection-annonce.cache.js': { selectionAnnonceCache: cache },
    'repositories/selection-annonce.repository.js': { topBetween: async (start, end, limit) => { calls++; return [{ idPublic: 'a', scoreSelection: 12 }].slice(0, limit); } },
  });
  const [a, b] = await Promise.all([service.getSelections(), service.getSelections()]);
  assert.equal(calls, 2); // one query for the week, one for the month
  assert.equal(a.vedette.idPublic, b.vedette.idPublic);
  await service.getSelections();
  assert.equal(calls, 2);
  service.removeFromSelections('a');
  assert.equal((await service.getSelections()).vedette, null);
});

test('support persists all forms, applies contact overrides, and restricts request details', async () => {
  const h = database(), service = h.load('services/ApiService/service_client.service.js');
  const contacts = await service.getContacts();
  assert.ok(contacts.email);
  h.records.set('parametres/service_client', { email: 'support@example.com' });
  assert.equal((await service.getContacts()).email, 'support@example.com');
  const user = { idPublic: 'tenant', langue: 'en', email: 'tenant@example.com' };
  const m = await service.createMessage({ data: { object: 'Question', message: 'A message' }, user, role: 'locataire' });
  await service.createReclamation({ data: { type: 'paiement', object: 'Claim', message: 'A claim' }, user, role: 'locataire' });
  await service.createSignalement({ data: { type: 'annonce', idElement: 'a', message: 'A report' }, user, role: 'locataire' });
  assert.equal((await service.getDemandes({ userId: user.idPublic })).total, 3);
  assert.equal((await service.getDemandes({ userId: user.idPublic, filters: { type: 'reclamation' } })).total, 1);
  assert.equal((await service.getDemande({ id: m.idPublic, type: 'message', userId: user.idPublic })).langue, 'en');
  await assert.rejects(service.getDemande({ id: m.idPublic, type: 'message', userId: 'other' }), { statusCode: 403 });
});

test('report email is translated and remains pending until provider success', async () => {
  const h = database({ 'signalement/r': { emailAdminPending: true } }), sent = [];
  const previous = { email: process.env.ADMIN_REPORT_EMAIL, lang: process.env.ADMIN_LANGUAGE };
  process.env.ADMIN_REPORT_EMAIL = 'admin@example.com'; process.env.ADMIN_LANGUAGE = 'en';
  let failure = true;
  try {
    const service = h.load('services/signalementMail.service.js', { 'config/mail.config.js': { resend: { emails: { send: async (data, options) => { sent.push({ data, options }); return { error: failure ? { message: 'temporary' } : null }; } } } } });
    const report = { idPublic: 'r', idCible: 'a', raison: 'arnaque', description: 'Details' };
    assert.equal(await service.deliver('r', report), false);
    assert.equal(h.records.get('signalement/r').emailAdminPending, true);
    failure = false;
    assert.equal(await service.deliver('r', report), true);
    assert.equal(h.records.get('signalement/r').emailAdminPending, false);
    assert.match(sent[0].data.subject, /report/i);
    assert.equal(sent[0].options.idempotencyKey, 'report-r');
  } finally {
    for (const [key, value] of [['ADMIN_REPORT_EMAIL', previous.email], ['ADMIN_LANGUAGE', previous.lang]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('application list resolves participant enrichment before JSON serialization', async () => {
  const h = database({
    'candidature/c': { idPublic: 'c', locataireId: 'tenant', bailleurId: 'owner', annonceId: 'a', createdAt: Timestamp.now(), delete: {} },
    'annonce/a': { idPublic: 'a', bienId: 'b' }, 'bien/b': { idPublic: 'b' },
    'locataire/t': { idPublic: 'tenant', nom: 'Test', status: 'actif' },
  });
  const service = h.load('services/ApiService/candidature.service.js', { 'services/notification.service.js': { createNotification: async () => ({ success: true }) } });
  const result = await service.getCandidatures({ filters: {}, user: { idPublic: 'owner' }, role: 'bailleur' });
  const payload = JSON.parse(JSON.stringify(result));
  assert.equal(payload.candidatures[0].idPublic, 'c');
  assert.equal(payload.candidatures[0].locataire.nom, 'Test');
  assert.equal(payload.candidatures[0].bien.idPublic, 'b');
});
