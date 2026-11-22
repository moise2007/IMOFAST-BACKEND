const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const {createMessageSchema} = require("../src/validators/message.validator");

const medias = [
  {type: "video", url: "https://example.com/video.mp4", taille: 20},
  {type: "image", url: "https://example.com/photo.jpg", taille: 10},
];

test("la validation accepte une galerie et refuse les sélections invalides", () => {
  const base = {conversationId: "conversation_1", type: "galerie", medias};
  assert.equal(createMessageSchema.safeParse(base).success, true);
  assert.equal(createMessageSchema.safeParse({...base, medias: [medias[0]]}).success, false);
  assert.equal(createMessageSchema.safeParse({...base, medias: Array(11).fill(medias[0])}).success, false);
  assert.equal(createMessageSchema.safeParse({...base, medias: [{...medias[0], type: "audio"}, medias[1]]}).success, false);
  assert.equal(createMessageSchema.safeParse({...base, medias: undefined}).success, false);
});

test("une galerie reste un seul message avec ses médias dans leur ordre", () => {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (parent?.filename.endsWith("/src/models/message.js") && request === "../config/firebase") {
      return {admin: {firestore: {Timestamp: {now: () => ({toMillis: () => 1000}), fromMillis: millis => millis}}}};
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const modelPath = require.resolve("../src/models/message");
  delete require.cache[modelPath];
  try {
    const {Message} = require(modelPath);
    const document = new Message({conversationId: "conversation_1", auteurId: "user_1", idPublic: "message_1", type: "galerie", medias}).toFirebase();
    assert.equal(document.type, "galerie");
    assert.equal(document.medias.length, 2);
    assert.deepEqual(document.medias.map(media => media.type), ["video", "image"]);
    assert.equal(document.medias[1].url, medias[1].url);
  } finally {
    Module._load = originalLoad;
    delete require.cache[modelPath];
  }
});
