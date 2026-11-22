const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

function createHarness() {
  const records = new Map();
  const collection = {
    add: async (data) => {
      const id = `doc-${records.size + 1}`;
      records.set(id, { ...data });
      return { id };
    },
    doc: (id) => ({
      get: async () => document(id),
      delete: async () => { records.delete(id); },
      update: async (patch) => { Object.assign(records.get(id), patch); },
    }),
    where: (field, operator, value) => query([[field, operator, value]]),
  };
  const document = (id) => ({
    id,
    data: () => records.get(id),
    ref: collection.doc(id),
  });
  const query = (filters = [], direction = "desc", cursor = null, size = Infinity) => ({
    where: (field, operator, value) => query([...filters, [field, operator, value]], direction, cursor, size),
    orderBy: (_field, order) => query(filters, order, cursor, size),
    startAfter: (snapshot) => query(filters, direction, snapshot.id, size),
    limit: (value) => query(filters, direction, cursor, value),
    get: async () => {
      let ids = [...records.keys()].filter((id) => filters.every(([field, , value]) => records.get(id)[field] === value));
      ids.sort((a, b) => (records.get(b).createdAt - records.get(a).createdAt) * (direction === "desc" ? 1 : -1));
      if (cursor) ids = ids.slice(ids.indexOf(cursor) + 1);
      const docs = ids.slice(0, size).map(document);
      return { docs, empty: docs.length === 0 };
    },
  });
  const db = {
    collection: () => collection,
    batch: () => {
      const updates = [];
      return {
        update: (ref, patch) => updates.push([ref, patch]),
        commit: async () => { for (const [ref, patch] of updates) await ref.update(patch); },
      };
    },
  };
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (parent?.filename.endsWith("/repositories/notification.repository.js") && request === "../config/firebase") {
      return { db, admin: { firestore: { Timestamp: { now: () => 999 } } } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const path = require.resolve("../src/repositories/notification.repository");
  delete require.cache[path];
  let repository;
  try { repository = require(path); }
  finally { Module._load = originalLoad; delete require.cache[path]; }
  return { repository, records };
}

test("les pages et lectures de notifications restent propres au destinataire", async () => {
  const { repository, records } = createHarness();
  await repository.create({ idPublic: "a1", destinataireId: "alice", lu: false, createdAt: 3 });
  await repository.create({ idPublic: "b1", destinataireId: "bob", lu: false, createdAt: 4 });
  await repository.create({ idPublic: "a2", destinataireId: "alice", lu: false, createdAt: 2 });
  await repository.create({ idPublic: "a3", destinataireId: "alice", lu: true, createdAt: 1 });

  const first = await repository.findAllByDestinataire({ destinataireId: "alice", pageSize: 1 });
  assert.deepEqual(first.notifications.map((item) => item.idPublic), ["a1"]);
  assert.equal(first.hasMore, true);
  const second = await repository.findAllByDestinataire({ destinataireId: "alice", pageSize: 1, lastId: first.lastId });
  assert.deepEqual(second.notifications.map((item) => item.idPublic), ["a2"]);

  assert.equal(await repository.markAllAsRead({ destinataireId: "alice" }), 2);
  assert.equal([...records.values()].find((item) => item.idPublic === "b1").lu, false);
  assert.equal([...records.values()].find((item) => item.idPublic === "a2").lu, true);
});

test("la liste courante lit seulement les 20 dernières notifications", async () => {
  const { repository } = createHarness();
  for (let index = 0; index < 25; index++) {
    await repository.create({ idPublic: `a${index}`, destinataireId: "alice", createdAt: index });
  }
  await repository.create({ idPublic: "other", destinataireId: "bob", createdAt: 100 });
  const latest = await repository.findLatestByDestinataire("alice");
  assert.equal(latest.length, 20);
  assert.equal(latest[0].idPublic, "a24");
  assert.equal(latest.at(-1).idPublic, "a5");
});
