const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { emptyNotes, notesFromVotes, changeVote, isNotesDistribution } = require("../src/utils/notesDistribution");

function repositoryFixture(typeCible, notes, votes = []) {
  const records = new Map([[typeCible + "/target", { idPublic: "public-target", notes }]]);
  votes.forEach((vote, index) => records.set("note/vote" + index, {
    idPublic: "vote" + index, cibleId: "public-target", typeCible, ...vote,
  }));
  let sequence = 0;
  let transactionReads = 0;
  const reference = (path) => ({ path, id: path.split("/")[1] });
  const query = (collection, filters = [], limit = Infinity) => ({
    collection, filters, count: limit,
    where(field, operator, value) {
      assert.equal(operator, "==");
      return query(collection, [...filters, [field, value]], limit);
    },
    limit(value) { return query(collection, filters, value); },
    doc(id = "new" + ++sequence) { return reference(collection + "/" + id); },
  });
  const db = {
    collection: (name) => query(name),
    async runTransaction(callback) {
      const writes = [];
      const result = await callback({
        async get(request) {
          assert.equal(writes.length, 0, "all reads must precede writes");
          transactionReads++;
          const docs = [...records.entries()]
            .filter(([path, data]) => path.startsWith(request.collection + "/") && request.filters.every(([field, value]) => data[field] === value))
            .slice(0, request.count)
            .map(([path, data]) => ({ id: reference(path).id, ref: reference(path), data: () => data }));
          return { empty: docs.length === 0, docs };
        },
        set(ref, data) { writes.push(() => records.set(ref.path, { ...records.get(ref.path), ...data })); },
        update(ref, data) { writes.push(() => records.set(ref.path, { ...records.get(ref.path), ...data })); },
        delete(ref) { writes.push(() => records.delete(ref.path)); },
      });
      writes.forEach((write) => write());
      return result;
    },
  };
  const sandbox = {
    module: { exports: {} },
    require(name) {
      if (name === "../config/firebase") return { db, admin: { firestore: { Timestamp: { now: () => "now" } } } };
      if (name === "../utils/notesDistribution") return { emptyNotes, notesFromVotes, changeVote, isNotesDistribution };
      throw new Error("Unexpected import " + name);
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../src/repositories/note.repository"), "utf8"), sandbox);
  return { repository: sandbox.module.exports, records, reads: () => transactionReads };
}

test("distribution counts actual votes and supports changing/removing a vote", () => {
  const initial = notesFromVotes([{ valeur: 5 }, { valeur: 5 }, { valeur: 3 }, { valeur: 0 }]);
  assert.deepEqual(initial.map((entry) => entry.nombre), [0, 0, 1, 0, 2]);
  const updated = changeVote(initial, 5, 2);
  assert.deepEqual(updated.map((entry) => entry.nombre), [0, 1, 1, 0, 1]);
  assert.deepEqual(changeVote(updated, 2, 0).map((entry) => entry.nombre), [0, 0, 1, 0, 1]);
  assert.equal(initial[4].nombre, 2);
  assert.equal(isNotesDistribution({ moyenne: 4, nombre: 3 }), false);
  assert.equal(isNotesDistribution(emptyNotes()), true);
});

for (const typeCible of ["annonce", "bailleur", "locataire"]) {
  test(typeCible + ": create, change, remove and repeat without double-counting", async () => {
    const { repository, records, reads } = repositoryFixture(typeCible, emptyNotes());
    const target = { typeCible, cibleId: "public-target", auteurId: "user" };
    const created = await repository.voter({ ...target, valeur: 5 });
    assert.equal(created.action, "created");
    assert.equal(created.notes[4].nombre, 1);
    const updated = await repository.voter({ ...target, valeur: 3 });
    assert.equal(updated.action, "updated");
    assert.equal(updated.notes[4].nombre, 0);
    assert.equal(updated.notes[2].nombre, 1);
    assert.equal([...records.keys()].filter((key) => key.startsWith("note/")).length, 1);
    const removed = await repository.voter({ ...target, valeur: 0 });
    assert.equal(removed.action, "deleted");
    assert.equal(removed.notes.reduce((total, entry) => total + entry.nombre, 0), 0);
    assert.equal((await repository.voter({ ...target, valeur: 0 })).action, "noop");
    assert.ok(reads() >= 8);
  });

  test(typeCible + ": migrates old aggregates from individual votes on read", async () => {
    const { repository, records } = repositoryFixture(typeCible, { moyenne: 4, nombre: 2, somme: 8 }, [
      { auteurId: "one", valeur: 3 }, { auteurId: "two", valeur: 5 },
    ]);
    const result = await repository.findByCible({ typeCible, cibleId: "public-target" });
    assert.equal(result.note[2].nombre, 1);
    assert.equal(result.note[4].nombre, 1);
    assert.ok(Array.isArray(records.get(typeCible + "/target").notes));
    assert.equal(records.get("note/vote0").valeur, 3);
  });
}

test("migration and vote update happen together using the previous vote", async () => {
  const { repository } = repositoryFixture("annonce", { moyenne: 5, nombre: 1, somme: 5 }, [{ auteurId: "user", valeur: 5 }]);
  const result = await repository.voter({ typeCible: "annonce", cibleId: "public-target", auteurId: "user", valeur: 1 });
  assert.equal(result.action, "updated");
  assert.equal(result.notes[0].nombre, 1);
  assert.equal(result.notes[4].nombre, 0);
});
