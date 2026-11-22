const test = require('node:test');
const assert = require('node:assert/strict');
const { database, Timestamp } = require('./helpers/backendHarness.cjs');
const { calculerNoteCandidature, appointmentDate } = require('../src/utils/candidatureScore');
const { publicationFields } = require('../src/utils/publication');
const { dayKey, evolution } = require('../src/utils/statistics');
const { selectionWindows, listingScore } = require('../src/utils/listingSelections');
const { assertAgencyName } = require('../src/utils/agencyName');
const { publicJsonReplacer } = require('../src/utils/privateFields');
const { buildKeywordRecord, tokens, matchesFilters } = require('../src/utils/annonceKeywords');
const json = value => JSON.parse(JSON.stringify(value));
const ts = value => Timestamp.fromDate(new Date(value));

test('score, time boundaries, growth, and reserved agency variants', () => {
  const user = { preferences: { maxBudget: 100000, typeBien: 'logement', quartier: 'Bonabéri' }, devise: 'XAF' };
  const listing = { loyer: [{ prix: 100000 }], devise: 'XAF' };
  const property = { typeBien: 'logement', localisation: { quartier: 'bonaberi' } };
  assert.equal(calculerNoteCandidature(user, listing, property), 100);
  assert.equal(calculerNoteCandidature({ ...user, preferences: { ...user.preferences, maxBudget: 50000 } }, listing, property), 70);
  assert.equal(calculerNoteCandidature({}, {}, {}), 0);
  assert.equal(appointmentDate({ dateSouhaitee: '2026-02-30', heureSouhaitee: '12:00' }), null);
  assert.equal(appointmentDate({ dateSouhaitee: '2026-11-21', heureSouhaitee: '18:00' }).toISOString(), '2026-11-21T17:00:00.000Z');
  assert.equal(dayKey(new Date('2026-11-20T23:00:00Z')), '2026-11-21');
  assert.equal(evolution(0, 0), 0); assert.equal(evolution(5, 0), 100); assert.equal(evolution(3, 6), -50);
  for (const name of ['Agence IMOFAST', 'Í m o-Fàst', '1m0f@5t', 'immoofaast', 'imofast immobilier']) assert.throws(() => assertAgencyName(name), { statusCode: 400 });
  assert.doesNotThrow(() => assertAgencyName('Agence Horizon'));
  const windows = selectionWindows(new Date('2026-11-23T17:00:00Z'));
  assert.equal(windows.weekStart.toISOString(), '2026-11-15T23:00:00.000Z');
  assert.equal(windows.weekEnd.toISOString(), '2026-11-22T23:00:00.000Z');
  assert.equal(listingScore({ statistiques: { vues: 10, commentaires: 2, favoris: 3 } }), 31);
});

test('publication scheduling validates dates and preserves draft/public status semantics', () => {
  const now = new Date('2026-11-21T12:00:00Z');
  assert.equal(publicationFields({ datePublication: '2026-11-21T18:00:00+01:00' }, {}, now).status, 'programmee');
  assert.equal(publicationFields({ status: 'brouillon' }, {}, now).estPubliee, false);
  assert.equal(publicationFields({ status: 'active' }, {}, now).status, 'publier');
  assert.throws(() => publicationFields({ status: 'programmee' }, {}, now), { statusCode: 400 });
  assert.throws(() => publicationFields({ datePublication: '2026-11-22T12:00:00Z', dateExpiration: '2026-11-21' }, {}, now), { statusCode: 400 });
});

test('candidature read/attendance are authorized and future appointments cannot be declared', async () => {
  const h = database({ 'candidature/c': { idPublic: 'c', bailleurId: 'owner', locataireId: 'tenant', type: 'visite', statut: 'visitePrevue',
    vu: false, visite: { dateSouhaitee: '2026-11-21', heureSouhaitee: '18:00' } } });
  const repo = h.load('repositories/candidature.repository.js');
  await assert.rejects(repo.markRead({ idPublic: 'c', userId: 'tenant' }), { statusCode: 404 });
  await repo.markRead({ idPublic: 'c', userId: 'owner' });
  assert.equal(h.records.get('candidature/c').vu, true);
  const request = { idPublic: 'c', userId: 'owner', role: 'bailleur', honore: true };
  await assert.rejects(repo.setAttendance({ ...request, now: new Date('2026-11-21T17:00:00Z') }), { statusCode: 409 });
  await Promise.all([
    repo.setAttendance({ ...request, now: new Date('2026-11-21T17:01:00Z') }),
    repo.setAttendance({ ...request, userId: 'tenant', role: 'locataire', honore: false, now: new Date('2026-11-21T17:01:00Z') }),
  ]);
  assert.equal(h.records.get('candidature/c').honoree.bailleur.honore, true);
  assert.equal(h.records.get('candidature/c').honoree.locataire.honore, false);
  await assert.rejects(repo.setAttendance({ ...request, userId: 'stranger', now: new Date('2026-11-22') }), { statusCode: 404 });
});

test('concurrent applications cannot overspend the remaining quota', async () => {
  const h = database({ 'locataire/t': { forfait: { type: 'aucun' }, candidatures: { candidaturesRestantes: 1 } },
    'annonce/a': { idPublic: 'a', status: 'publier', estPubliee: true } });
  const repo = h.load('repositories/candidature.repository.js');
  const data = { annonceId: 'a', locataireId: 'tenant', statut: 'en_attente', createdAt: Timestamp.now() };
  const results = await Promise.allSettled(['one', 'two'].map(idPublic => repo.createAtomic({ ...data, idPublic }, { userId: 't' })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(h.records.get('locataire/t').candidatures.candidaturesRestantes, 0);
  assert.equal(h.records.get('annonce/a').statistiques.candidatures, 1);
});

test('internal activity counts only committed creations and never reaches JSON', async () => {
  const h = database({ 'bailleur/o': { idPublic: 'owner' }, 'locataire/t': { idPublic: 'tenant' } });
  const repo = h.load('repositories/conversation.repository.js');
  const data = { idPublic: 'conv', bailleurId: 'owner', locataireId: 'tenant', idParticipants: ['owner', 'tenant'] };
  await Promise.all(Array.from({ length: 4 }, () => repo.create(data, { role: 'bailleur', userId: 'owner' })));
  assert.equal(h.records.get('bailleur/o').activiteInterne.conversationsCreees, 1);
  const convPath = [...h.records.keys()].find(p => p.startsWith('conversation/'));
  const messages = h.load('repositories/message.repository.js');
  await Promise.all(Array.from({ length: 4 }, () => messages.create({ idPublic: 'm', auteurId: 'owner', type: 'texte', contenu: 'Hello', createdAt: Timestamp.now() },
    { role: 'bailleur', conversationDocumentId: convPath.split('/')[1], conversation: data })));
  assert.equal(h.records.get('bailleur/o').activiteInterne.messagesEnvoyes, 1);
  assert.equal(h.records.get(convPath).nonLus.tenant, 1);
  const response = JSON.parse(JSON.stringify({ nested: { password: 'hash', activiteInterne: { notes: 1 }, notifications: [{ endpoint: 'secret' }], nom: 'User' }, notifications: [{ titre: 'Visible notification' }] }, publicJsonReplacer));
  assert.deepEqual(response.nested, { nom: 'User' });
  assert.equal(response.notifications.length, 1);
});

test('keyword index supports accent folding, prefixes, combined filters and option-consistent pricing', async () => {
  assert.deepEqual(tokens('Le STUDIO à Bonabéri and the jardin'), ['studio', 'bonaberi', 'jardin']);
  const property = { typeBien: 'logement', nature: 'moderne', localisation: { ville: 'Douala', quartier: 'Bonabéri' } };
  const listing = { idPublic: 'a', bienId: 'b', bailleurId: 'owner', titre: 'Studio avec jardin', status: 'publier', estPubliee: true,
    nature: 'location', devise: 'XAF', createdAt: ts('2026-11-20'), loyer: [{ prix: 100000, duree: 'mois', min: 3 }, { prix: 10000, duree: 'jour', min: 1 }] };
  const index = buildKeywordRecord(listing, property);
  assert.equal(matchesFilters(index, { prixMax: 20000, duree: 'mois' }), false);
  assert.equal(matchesFilters(index, { prixMax: 120000, duree: 'mois', nombreDurees: 2 }), false);
  const h = database({ 'annonce/a': listing, 'annonce_motscles/a': index,
    'annonce/b': { ...listing, idPublic: 'b', titre: 'Studio' }, 'annonce_motscles/b': buildKeywordRecord({ ...listing, idPublic: 'b', titre: 'Studio' }, property) });
  const repo = h.load('repositories/annonce-keywords.repository.js');
  const result = await repo.search({ criteres: { status: 'publier', search: 'stud jard', ville: 'douala', nature: 'moderne', prixMax: 120000, duree: 'mois', nombreDurees: 3 }, page: 1, limit: 1 });
  assert.equal(result.totalItems, 2);
  assert.equal(result.annonces[0].idPublic, 'a');
  assert.equal(result.annonces[0].scoreRecherche, 2);
  assert.ok(h.reads.find(r => r.collection === 'annonce_motscles').filters.some(f => f[0] === 'prefixes' && f[1] === 'array-contains-any'));
});

test('dashboard periods, zeros, ranking, latest entries and profile fields are computed on the backend', async () => {
  const h = database({
    'annonce/a': { idPublic: 'a', bailleurId: 'owner', statistiques: { candidatures: 2, vues: 5 } },
    'annonce/b': { idPublic: 'b', bailleurId: 'owner', statistiques: { candidatures: 1, vues: 100 } },
    'bien/b': { idPublic: 'b', bailleurId: 'owner', createdAt: ts('2026-11-21') },
    'statistiques_bailleur/o1': { bailleurId: 'owner', date: '2026-11-20', vues: 5 },
    'statistiques_bailleur/o2': { bailleurId: 'owner', date: '2026-11-10', vues: 10 },
    'conversation/c': { idPublic: 'c', bailleurId: 'owner', updatedAt: ts('2026-11-21') },
    'conversation/hidden': { idPublic: 'hidden', bailleurId: 'owner', updatedAt: ts('2026-11-21'), delete: { owner: true } },
  });
  const service = h.load('services/ApiService/dashboard.service.js');
  const result = await service.getDashboard({ user: { idPublic: 'owner' }, now: new Date('2026-11-21T12:00:00Z') });
  assert.equal(result.cartes.vues.evolution, -50);
  assert.equal(result.cartes.biens.evolution, 100);
  assert.equal(result.cartes.favoris.evolution, 0);
  assert.equal(result.vuesHebdomadaires.length, 7);
  assert.equal(result.meilleuresAnnonces[0].idPublic, 'a');
  assert.equal(result.conversations.length, 1);
  assert.ok(result.completudeProfil.champsManquants.includes('nom'));
});

test('onboarding cannot skip steps or assert prerequisites supplied by the client', async () => {
  const h = database({ 'bailleur/o': { idPublic: 'owner', onboarding: { etape: 'bien', termine: false } } });
  const repo = h.load('repositories/onboarding.repository.js');
  await assert.rejects(repo.advance({ userId: 'o', etape: 'notifications' }), { statusCode: 409 });
  await assert.rejects(repo.advance({ userId: 'o', etape: 'bien' }), { statusCode: 409 });
  h.records.set('bien/b', { bailleurId: 'owner' });
  assert.equal((await repo.advance({ userId: 'o', etape: 'bien' })).etape, 'annonce');
  h.records.set('annonce/a', { bailleurId: 'owner', status: 'publier' });
  assert.equal((await repo.advance({ userId: 'o', etape: 'annonce' })).etape, 'notifications');
  await assert.rejects(repo.advance({ userId: 'o', etape: 'notifications' }), { statusCode: 409 });
  h.records.get('bailleur/o').notifications = [{ endpoint: 'accepted-device' }];
  assert.equal((await repo.advance({ userId: 'o', etape: 'notifications' })).etape, 'alertes');
  await assert.rejects(repo.advance({ userId: 'o', etape: 'alertes' }), { statusCode: 409 });
  await repo.markAlertsSeen('o');
  assert.equal((await repo.advance({ userId: 'o', etape: 'alertes' })).termine, true);
});
