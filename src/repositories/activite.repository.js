const { db, admin } = require('../config/firebase');
async function authorRef(role, idPublic, tx) {
  if (!['bailleur', 'locataire'].includes(role) || !idPublic) return null;
  const query = db.collection(role).where('idPublic', '==', idPublic).limit(1);
  const snapshot = await (tx ? tx.get(query) : query.get());
  return snapshot.docs[0]?.ref ?? null;
}
function increment(writer, ref, field) {
  if (ref) writer.update(ref, { [`activiteInterne.${field}`]: admin.firestore.FieldValue.increment(1) });
}
module.exports = { authorRef, increment };
