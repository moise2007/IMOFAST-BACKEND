const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAlerteSchema, getAlertesSchema, validate } = require('../src/validators/alerte.validator');

test('alert creation accepts the form contract and normalizes location', () => {
  const result = createAlerteSchema.parse({ ville: ' Douala ', natureAnnonce: 'location', frequence: 'mois', duree: 2, prix: 50000, nombreChambre: 0 });
  assert.equal(result.ville, 'douala');
  assert.equal(result.frequence, 'mois');
  assert.equal(result.duree, 2);
  assert.equal(createAlerteSchema.safeParse({ ville: 'Douala', frequence: 2, duree: 'mois' }).success, false);
});
test('minimal alerts are supported and ownership cannot be forged', () => {
  assert.equal(createAlerteSchema.safeParse({ ville: 'Douala' }).success, true);
  for (const data of [{ auteurId: 'someone' }, { idPublic: 'other' }]) assert.equal(createAlerteSchema.safeParse({ ville: 'Douala', ...data }).success, false);
});
test('pagination defaults, upper bound and price range are validated', () => {
  assert.deepEqual(getAlertesSchema.parse({}), { page: 1, limit: 10 });
  assert.equal(getAlertesSchema.parse({ page: '2', limit: '30' }).page, 2);
  for (const data of [{page: 0}, {limit: 51}, {prixMin: 50, prixMax: 20}]) assert.equal(getAlertesSchema.safeParse(data).success, false);
});
test('validation returns request-language messages', () => {
  let body;
  const req = { body: {}, t: (key) => `translated:${key}` };
  const res = { status(code) { assert.equal(code, 400); return this; }, json(data) { body = data; } };
  validate(createAlerteSchema)(req, res, () => assert.fail('invalid request must not continue'));
  assert.equal(body.message, 'translated:errors:alerte.invalid');
  assert.equal(body.errors.ville, 'translated:errors:alerte.validation.required');
});

test('alert IDs cannot address nested Firestore paths', () => {
  const { getAlerteSchema, deleteAlerteSchema } = require('../src/validators/alerte.validator');
  for (const schema of [getAlerteSchema, deleteAlerteSchema]) {
    for (const id of ['a/b/c', '.', '..', '']) assert.equal(schema.safeParse({ id }).success, false);
    assert.equal(schema.safeParse({ id: 'public-id' }).success, true);
  }
});

test('creation no longer reads or decrements subscription quotas', async () => {
  const vm = require('node:vm'); const fs = require('node:fs');
  const writes = [];
  const context = { exports: {}, require: () => ({
    db: { collection: name => ({ doc: id => ({ set: async data => writes.push({ name, id, data }) }) }) },
    admin: { firestore: { Timestamp: { now: () => 123 } } },
  }) };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/repositories/alerte.repository'), 'utf8'), context);
  await context.exports.create({ idPublic: 'first' });
  await context.exports.create({ idPublic: 'second' });
  assert.equal(writes.length, 2); assert.ok(writes.every(write => write.name === 'alerte'));
});
test('creation gives precise errors for wrong types and incompatible criteria', () => {
  for (const data of [{ prix: true }, { prix: '1000' }, { caution: -1 }, { duree: 1.5 }, { equipements: [false] }]) {
    assert.equal(createAlerteSchema.safeParse({ ville: 'Douala', ...data }).success, false);
  }
  const range = createAlerteSchema.safeParse({ ville: 'Douala', prixMin: 2000, prixMax: 1000 });
  assert.equal(range.error.issues[0].path[0], 'prixMin');
  assert.equal(range.error.issues[0].message, 'range');
  const sale = createAlerteSchema.safeParse({ ville: 'Douala', natureAnnonce: 'vente', caution: 1000 });
  assert.equal(sale.error.issues[0].path[0], 'caution');
});
test('alert service accepts accounts without a subscription and preserves role authorization', async () => {
  const vm = require('node:vm'); const fs = require('node:fs');
  const context = { exports: {}, require: name => {
    if (name.includes('cuid2')) return { createId: () => 'new-alert' };
    if (name.includes('AppError')) return require('../src/errors/AppError');
    if (name.includes('alerte.repository')) return { create: async data => data };
    if (name.includes('consultation')) return {};
    if (name.includes('alertDelivery')) return { notifyOwnersForAlert: async () => {} };
    throw new Error(name);
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/services/ApiService/alerte.service'), 'utf8'), context);
  for (const forfait of [undefined, { type: 'aucun' }, { type: 'mensuel', fin: { seconds: 0 } }]) {
    const result = await context.exports.createAlerte({ data: { ville: 'douala' }, user: { idPublic: 'tenant', forfait, nombreAlertesRestants: 0 }, role: 'locataire' });
    assert.equal(result.auteurId, 'tenant'); assert.equal(result.actif, true);
  }
  await assert.rejects(context.exports.createAlerte({ data: {}, user: {}, role: 'bailleur' }), { statusCode: 403 });
});
