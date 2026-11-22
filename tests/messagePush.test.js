const {test} = require("node:test");
const assert = require("node:assert/strict");
const {notifyNewMessage, isPushEndpoint} = require("../src/notifications/push/messagePush");
const {setNotificationIo} = require("../src/notifications/realtime");
const {messageNotificationTitle} = require("../src/notifications/messageTitle");
const web = {endpoint: "https://fcm.googleapis.com/fcm/send/example"};
function database(role, id, subscription, current = subscription) {
  const updates = [];
  const ref = {};
  return {updates, collection(name) {
    assert.equal(name, role);
    return {where(field, op, value) {
      assert.deepEqual([field, op, value], ["idPublic", "==", id]);
      return {limit: () => ({get: async () => ({docs: [{ref, data: () => ({notification: {web: subscription}})}]})})};
    }};
  }, runTransaction: fn => fn({
    get: () => ({data: () => ({notification: {web: current}})}),
    update: (r, patch) => { assert.equal(r, ref); updates.push(patch); },
  })};
}
for (const role of ["bailleur", "locataire"]) test("push ciblé vers " + role, async () => {
  const calls = [];
  await notifyNewMessage({db: database(role, "recipient", web), recipientId: "recipient", recipientRole: role,
    conversationId: "conv"}, (sub, payload) => calls.push([sub, JSON.parse(payload).url]));
  assert.deepEqual(calls, [[web, "/" + role + "/messagerie/conv"]]);
});
test("aucune livraison sans abonnement accepté", async () => {
  let calls = 0;
  await notifyNewMessage({db: database("locataire", "id", null), recipientId: "id", recipientRole: "locataire", conversationId: "c"}, () => calls++);
  assert.equal(calls, 0);
  assert.equal(isPushEndpoint("https://example.org/notify"), false);
});
test("aucun push navigateur si le destinataire est connecté", async () => {
  setNotificationIo({sockets: {adapter: {rooms: new Map([["recipient", new Set(["socket-1"])]])}}});
  try {
    let calls = 0;
    await notifyNewMessage({
      db: database("locataire", "recipient", web),
      recipientId: "recipient",
      recipientRole: "locataire",
      conversationId: "conv",
    }, () => { calls += 1; });
    assert.equal(calls, 0);
  } finally {
    setNotificationIo(null);
  }
});
test("le titre du message utilise le nom de l'expéditeur ou celui de l'agence", async () => {
  assert.equal(messageNotificationTitle({prenom: "Aïcha", nom: "Mballa"}), "Nouveau message de Aïcha Mballa");
  assert.equal(messageNotificationTitle({prenom: "Jean", nom: "Dupont", nomAgence: "Agence Horizon"}), "Nouveau message de Agence Horizon");
  assert.equal(messageNotificationTitle({}), "Nouveau message");

  let pushedTitle;
  await notifyNewMessage({
    db: database("bailleur", "recipient", web),
    recipientId: "recipient",
    recipientRole: "bailleur",
    conversationId: "conv",
    title: messageNotificationTitle({prenom: "Aïcha", nom: "Mballa"}),
  }, (_subscription, payload) => { pushedTitle = JSON.parse(payload).title; });
  assert.equal(pushedTitle, "Nouveau message de Aïcha Mballa");
});
test("un abonnement expiré est retiré sauf s’il a été remplacé", async () => {
  for (const current of [web, {endpoint: "https://web.push.apple.com/new"}]) {
    const db = database("bailleur", "id", web, current);
    await notifyNewMessage({db, recipientRole: "bailleur", recipientId: "id", conversationId: "c"},
      async () => { throw Object.assign(new Error(), {statusCode: 410}); });
    assert.deepEqual(db.updates, current === web ? [{"notification.web": null}] : []);
  }
});
