const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

function createHarness() {
  const conversation = {
    idPublic: "con_1", bailleurId: "bailleur_1", locataireId: "locataire_1",
    idParticipants: ["bailleur_1", "locataire_1"], delete: {}, nonLus: {locataire_1: 1},
  };
  const message = {idPublic: "msg_1", conversationId: "con_1", auteurId: "bailleur_1", lu: false};
  const document = data => ({data: () => data, ref: {update: async patch => Object.assign(data, patch)}});
  const records = {conversation: [document(conversation)], message: [document(message)]};
  const db = {
    collection(name) {
      const filters = [];
      const query = {
        where(field, _, value) { filters.push([field, value]); return query; },
        limit() { return query; },
        async get() {
          const docs = (records[name] ?? []).filter(doc => filters.every(([field, value]) => doc.data()[field] === value));
          return {empty: docs.length === 0, docs};
        },
        doc() { return {update: async () => {}}; },
      };
      return query;
    },
    batch() {
      const changes = [];
      return {
        update(ref, patch) { changes.push([ref, patch]); },
        async commit() { for (const [ref, patch] of changes) await ref.update(patch); },
      };
    },
  };
  const fakeFirebase = {
    db,
    admin: {firestore: {Filter: {and() {}, where() {}}, Timestamp: {now: () => new Date()}, FieldValue: {increment: n => n}}},
  };
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (parent?.filename.endsWith("/src/config/socket.io.js") && request === "./firebase") return fakeFirebase;
    if (parent?.filename.endsWith("/src/config/socket.io.js") && request === "../models/message") return {Message: class {}};
    return originalLoad.call(this, request, parent, isMain);
  };
  const socketModule = require.resolve("../src/config/socket.io");
  delete require.cache[socketModule];
  let initSocket;
  try { ({initSocket} = require(socketModule)); }
  finally { Module._load = originalLoad; delete require.cache[socketModule]; }

  const emitted = [];
  const rooms = new Map([["bailleur_1", new Set(["other-device"])]]);
  const io = {
    sockets: {adapter: {rooms}},
    use() {},
    on(event, handler) { if (event === "connection") io.connect = handler; },
    to(room) { return {emit(event, payload) { emitted.push({room, event, payload}); }}; },
  };
  initSocket(io);
  const handlers = {};
  const socket = {
    id: "tenant-device", role: "locataire", user: {idPublic: "locataire_1", id: "tenant-doc"},
    on(event, handler) { handlers[event] = handler; },
    join(room) { if (!rooms.has(room)) rooms.set(room, new Set()); rooms.get(room).add(socket.id); },
    leave(room) { rooms.get(room)?.delete(socket.id); },
    to(room) { return {emit(event, payload) { emitted.push({room, event, payload}); }}; },
  };
  io.connect(socket);
  return {conversation, message, emitted, handlers};
}

test("la présence est envoyée seulement aux interlocuteurs", async () => {
  const {emitted} = createHarness();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(emitted.filter(item => item.event === "presenceChanged"), [{
    room: "bailleur_1", event: "presenceChanged", payload: {idPublic: "locataire_1", enligne: true},
  }]);
  assert.equal(emitted.some(item => item.event === "userConnected" || item.event === "successVuMessages" || item.event === "messagesRead"), false);
});

test("la saisie et la lecture nécessitent une conversation autorisée", async () => {
  const {conversation, message, emitted, handlers} = createHarness();
  handlers.typingChanged({conversationId: "con_1", isTyping: true});
  assert.equal(emitted.some(item => item.event === "typingChanged"), false);
  let rejected;
  await handlers.joinConversation({conversationId: "con_inconnue"}, response => { rejected = response; });
  assert.equal(rejected.success, false);
  let joined;
  await handlers.joinConversation({conversationId: "con_1"}, response => { joined = response; });
  assert.deepEqual(joined, {success: true, otherOnline: true});
  handlers.typingChanged({conversationId: "con_1", isTyping: true});
  assert.equal(emitted.find(item => item.event === "typingChanged")?.room, "conversation:con_1");
  let read;
  await handlers.markConversationRead({conversationId: "con_1"}, response => { read = response; });
  assert.equal(read.success, true);
  assert.equal(message.lu, true);
  assert.equal(conversation["nonLus.locataire_1"], 0);
  const receipt = emitted.find(item => item.event === "messagesRead");
  assert.equal(receipt.room, "bailleur_1");
  assert.equal(receipt.payload.conversationId, "con_1");
  assert.equal(receipt.payload.readBy, "locataire_1");
});
