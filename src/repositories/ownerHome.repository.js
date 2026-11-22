const { db } = require("../config/firebase");
const rows = snapshot => snapshot.docs.map(doc => doc.data());
exports.forOwner = async (ownerId) => {
  const [annonces, biens, demandes, conversations] = await Promise.all(
    ["annonce", "bien", "candidature", "conversation"].map(name =>
      db.collection(name).where("bailleurId", "==", ownerId).get().then(rows))
  );
  return { annonces, biens, demandes, conversations };
};
exports.person = async id => {
  if (!id) return null;
  const snapshot = await db.collection("locataire").where("idPublic", "==", id).limit(1).get();
  const p = snapshot.docs[0]?.data();
  return p ? { idPublic: p.idPublic, nom: p.nom, prenom: p.prenom, photoProfil: p.photoProfil } : null;
};
exports.favorites = async ids => {
  const result = [];
  for (let i = 0; i < ids.length; i += 30) {
    result.push(...rows(await db.collection("favoris").where("annonceId", "in", ids.slice(i, i + 30)).get()));
  }
  return result;
};
