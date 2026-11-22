const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function harness() {
  const calls = [];
  const docs = [];
  const collection = {
    add: async (value) => { docs.push(value); calls.push(["add", value]); },
    orderBy: (...args) => { calls.push(["orderBy", ...args]); return collection; },
    limit: (value) => { calls.push(["limit", value]); return collection; },
    get: async () => ({ docs: docs.slice(-10).reverse().map((value, index) => ({ id: `search-${index}`, data: () => value })) }),
  };
  const db = {
    collection: (name) => {
      calls.push(["collection", name]);
      return { doc: (id) => {
        calls.push(["doc", id]);
        return { collection: (child) => { calls.push(["child", child]); return collection; } };
      } };
    },
  };
  const context = {
    module: { exports: {} },
    require: () => ({ db, admin: { firestore: { Timestamp: { now: () => ({ toDate: () => new Date("2026-01-01T00:00:00Z") }) } } } }),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../src/services/ApiService/rechercheAnnonce.service"), "utf8"), context);
  return { service: context.module.exports, calls, docs };
}

test("only first-page tenant listing searches are saved with validated criteria", async () => {
  const { service, calls, docs } = harness();
  const user = { id: "tenant-doc" };
  await service.saveSearch({ filters: { page: 1, limit: 10, sort: "recent" }, user, role: "locataire" });
  await service.saveSearch({ filters: { page: 1, natureAnnonce: "location" }, user, role: "locataire" });
  await service.saveSearch({ filters: { page: 2, search: "studio" }, user, role: "locataire" });
  await service.saveSearch({ filters: { page: 1, search: "studio" }, user, role: "bailleur" });
  assert.equal(docs.length, 0);

  await service.saveSearch({ filters: { page: 1, limit: 10, sort: "recent", search: "studio", ville: "douala" }, user, role: "locataire" });
  assert.equal(docs.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(docs[0].criteres)), { search: "studio", ville: "douala" });
  assert.deepEqual(calls.slice(0, 3), [["collection", "locataire"], ["doc", "tenant-doc"], ["child", "recherchesAnnonces"]]);
});

test("recent listing searches are scoped to the tenant and limited to ten", async () => {
  const { service, calls, docs } = harness();
  for (let index = 0; index < 12; index++) docs.push({ criteres: { search: `studio ${index}` }, createdAt: { toDate: () => new Date("2026-01-01T00:00:00Z") } });
  const result = await service.recentSearches({ id: "tenant-doc" });
  assert.equal(result.length, 10);
  assert.equal(result[0].criteres.search, "studio 11");
  assert.deepEqual(calls.slice(0, 5), [["collection", "locataire"], ["doc", "tenant-doc"], ["child", "recherchesAnnonces"], ["orderBy", "createdAt", "desc"], ["limit", 10]]);
});
