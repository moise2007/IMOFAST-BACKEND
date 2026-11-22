const { db } = require('../config/firebase');
const { compareListings, listingScore } = require('../utils/listingSelections');
async function topBetween(start, end, limit) {
  const query = db.collection('annonce').where('status', '==', 'publier')
    .where('datePublication', '>=', start.toISOString()).where('datePublication', '<', end.toISOString()).orderBy('datePublication');
  let cursor, top = [];
  do {
    const page = await (cursor ? query.startAfter(cursor) : query).limit(200).get();
    for (const doc of page.docs) {
      const annonce = doc.data();
      if (annonce.estPubliee === false || (annonce.dateExpiration && +new Date(annonce.dateExpiration) <= Date.now())) continue;
      top.push(annonce); top.sort(compareListings); top = top.slice(0, limit);
    }
    cursor = page.docs.length === 200 ? page.docs.at(-1) : null;
  } while (cursor);
  return top.map(a => ({ ...a, scoreSelection: listingScore(a) }));
}
module.exports = { topBetween };
