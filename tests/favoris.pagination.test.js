const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getFavorisSchema } = require('../src/validators/favori.validator');

test('favorite cursor rejects malformed input and accepts a stable timestamp + ID', () => {
  const cursor = Buffer.from(JSON.stringify([1700000000, 25, 'favorite-1'])).toString('base64url');
  assert.equal(getFavorisSchema.parse({ cursor }).cursor, cursor);
  for (const value of ['invalid', Buffer.from('[1,2,"a/b"]').toString('base64url'), Buffer.from('[1,-1,"a"]').toString('base64url')]) assert.equal(getFavorisSchema.safeParse({ cursor: value }).success, false);
});
test('favorite pagination reads limit + 1, scopes ownership and continues without reading the cursor document', async () => {
  const calls = [];
  const docs = ['a','b','c'].map((id,index) => ({ id, data: () => ({ idPublic: id, createdAt: { seconds: 100-index, nanoseconds: 0 } }) }));
  const query = {};
  for (const method of ['where','orderBy','startAfter','limit','offset']) query[method] = (...args) => { calls.push([method,...args]); return query; };
  query.get = async () => ({ docs });
  class Timestamp { constructor(seconds, nanoseconds) { this.seconds=seconds;this.nanoseconds=nanoseconds; } }
  const context = { module: { exports: {} }, Buffer, require: () => ({ db: { collection: () => query }, admin: { firestore: { Timestamp, FieldPath: { documentId: () => '__name__' } } } }) };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/repositories/favori.repository'), 'utf8'), context);
  const repository = context.module.exports;
  const page = await repository.findPageByLocataire({ locataireId: 'tenant', limit: 2 });
  assert.equal(page.items.length,2); assert.equal(page.hasMore,true);
  assert.deepEqual(calls.find(call => call[0]==='where'),['where','locataireId','==','tenant']);
  assert.deepEqual(calls.find(call => call[0]==='limit'),['limit',3]);
  calls.length=0;
  await repository.findPageByLocataire({ locataireId:'tenant',limit:2,cursor:page.nextCursor });
  const after = calls.find(call => call[0]==='startAfter');
  assert.equal(after[1].seconds,99);assert.equal(after[2],'b');
  assert.equal(calls.some(call => call[0]==='offset'),false);
});
