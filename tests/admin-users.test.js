const test = require('node:test');
const assert = require('node:assert/strict');
const { parseProfile, publicUser } = require('../src/utils/admin/users');
const profile = { nom: 'Martin', prenom: 'Anne', email: 'Anne@Example.org', telephone: '+237 699 123 456', nomAgence: '' };
test('normalizes contact details and validates required identifiers', () => {
 const result = parseProfile(profile, 'locataire');
 assert.equal(result.email, 'anne@example.org'); assert.equal(result.telephone, '+237699123456');
 assert.throws(() => parseProfile({ ...profile, email: '', telephone: '' }, 'locataire'));
 assert.throws(() => parseProfile({ ...profile, telephone: 'abc' }, 'locataire'));
});
test('rejects privilege injection and invalid agency profiles', () => {
 assert.throws(() => parseProfile({ ...profile, status: 'actif' }, 'locataire'));
 assert.throws(() => parseProfile(profile, 'admin'));
 assert.throws(() => parseProfile(profile, 'agence'));
 assert.throws(() => parseProfile({ ...profile, nomAgence: 'Imofast' }, 'agence'));
 assert.equal(parseProfile({ ...profile, nomAgence: 'Agence Horizon' }, 'agence').nomAgence, 'Agence Horizon');
});
test('creation requires a strong-length password; editing never returns passwords', () => {
 assert.throws(() => parseProfile({ ...profile, password: 'short' }, 'bailleur', true));
 assert.equal(parseProfile({ ...profile, password: 'long-password-123' }, 'bailleur', true).password, 'long-password-123');
 assert.equal(parseProfile({ ...profile, password: 'secret' }, 'bailleur').password, undefined);
});
test('public account projection excludes credentials, documents and internal fields', () => {
 const data = publicUser({ id: 'a', data: () => ({ ...profile, typeProfil: 'agence', password: 'hash', uidGoogle: 'private', cni: { image: 'private' }, verification: { isVerified: true }, createdAt: { toDate: () => new Date('2026-01-01') } }) }, 'bailleur');
 assert.equal(data.group, 'agence'); assert.equal(data.verified, true);
 for (const key of ['password','uidGoogle','cni','verification']) assert.equal(Object.hasOwn(data,key),false);
});
