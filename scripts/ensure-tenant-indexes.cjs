// Creates only the indexes Firestore requests for tenant query shapes.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const { v1 } = require('@google-cloud/firestore');
const Index = require('protobufjs').Root.fromJSON(require('@google-cloud/firestore/build/protos/admin_v1.json')).lookupType('google.firestore.admin.v1.Index');
const { db, admin } = require('../src/config/firebase');
const annonces = require('../src/repositories/annonce.repository');
const client = new v1.FirestoreAdminClient({ credentials: {
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}, projectId: process.env.FIREBASE_PROJECT_ID });
const manifestPath = require('node:path').join(__dirname, '../firestore.indexes.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath)) : { indexes: [], fieldOverrides: [] };
const criteria = [
  { status: 'publier' }, { status: 'publier', prixMax: 1000000 },
  { status: 'publier', sort: 'prixCroissant' }, { status: 'publier', sort: 'populaire' },
  { status: 'publier', ville: 'douala', prixMax: 1000000 },
  { status: 'publier', ville: 'douala', natureAnnonce: 'location', prixMax: 1000000 },
];
const tasks = criteria.map(criteres => () => annonces.findPage({ criteres, page: 1, limit: 1 }));
tasks.push(() => db.collection('favoris').where('locataireId','==','__index_check__').orderBy('createdAt','desc').orderBy(admin.firestore.FieldPath.documentId(),'desc').limit(1).get());
(async () => {
  for (let n = 0; n < tasks.length; n++) {
    try { await tasks[n](); console.log(`Query ${n + 1}: ready`); }
    catch (error) {
      const encoded = error.message.match(/create_composite=([^\s]+)/)?.[1];
      if (error.code !== 9 || !encoded) throw error;
      const index = Index.decode(Buffer.from(encoded, 'base64url'));
      const parent = index.name.split('/indexes/')[0];
      const entry = { collectionGroup: parent.split('/').at(-1), queryScope: 'COLLECTION', fields: index.fields.map(field => ({ fieldPath: field.fieldPath, ...(field.arrayConfig ? { arrayConfig: 'CONTAINS' } : { order: field.order === 2 ? 'DESCENDING' : 'ASCENDING' }) })) };
      if (!manifest.indexes.some(item => JSON.stringify(item) === JSON.stringify(entry))) manifest.indexes.push(entry);
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      if (!process.argv.includes('--apply')) { console.log(`Query ${n + 1}: index recorded`); continue; }
      try {
        const [operation] = await client.createIndex({ parent, index: { queryScope: index.queryScope, fields: index.fields } });
        console.log(`Query ${n + 1}: building index`);
        await operation.promise(); console.log(`Query ${n + 1}: index ready`);
      } catch (createError) { if (createError.code !== 6) throw createError; console.log(`Query ${n + 1}: index already exists`); }
    }
  }
})().catch(error => { console.error(error.code, error.message); process.exitCode = 1; }).finally(async () => { await client.close(); await db.terminate(); });
