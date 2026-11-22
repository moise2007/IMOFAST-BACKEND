// Explicit maintenance command; never runs when the API starts.
require('dotenv').config();
const { db, admin } = require('../src/config/firebase');
const { reindexListing } = require('../src/repositories/annonce-keywords.repository');
async function main() {
  let cursor, count = 0;
  do {
    let query = db.collection('annonce').orderBy(admin.firestore.FieldPath.documentId()).limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) { await reindexListing(doc.data().idPublic); count++; }
    cursor = page.docs.length === 100 ? page.docs.at(-1) : null;
  } while (cursor);
  console.log(JSON.stringify({ indexed: count }));
}
main().then(() => process.exit(0)).catch(error => { console.error(error.code || error.name); process.exit(1); });
