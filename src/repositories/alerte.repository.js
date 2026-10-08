const { admin, db } = require("../config/firebase");
const { Timestamp, FieldValue } = admin.firestore;

exports.create = async (alerte, { decrementQuotaOf } = {}) => {
  const now = Timestamp.now();
  const data = { ...alerte, createdAt: now, updatedAt: now };

  const batch = db.batch();
  batch.set(db.collection("alerte").doc(data.idPublic), data);

  if (decrementQuotaOf) {
    batch.update(db.collection("locataire").doc(decrementQuotaOf), {
      nombreAlertesRestants: FieldValue.increment(-1),
    });
  }

  await batch.commit(); // tout ou rien
  return data;
};

const EGALITE = ["type", "nature", "natureAnnonce", "ville", "quartier", "nombreChambre", "auteurId"];

exports.findByIdPublic = async (idPublic) => {
  const snap = await db.collection("alerte").doc(idPublic).get();
  return snap.exists ? snap.data() : null;
};

exports.findLocataireSummaryByPublicId = async (idPublic) => {
  if (!idPublic) return null;
  const snap = await db.collection("locataire").where("idPublic", "==", idPublic).limit(1).get();
  if (snap.empty) return null;

  const { idPublic: publicId, nom, prenom, photoProfil } = snap.docs[0].data();
  return { idPublic: publicId, nom, prenom, photoProfil };
};

// Filtres communs à la lecture et au comptage
const buildFilteredQuery = (criteres) => {
  let query = db.collection("alerte");

  for (const champ of EGALITE) {
    if (criteres[champ] !== undefined) {
      query = query.where(champ, "==", criteres[champ]);
    }
  }

  const { prixMin, prixMax } = criteres;
  if (prixMin !== undefined) query = query.where("prix", ">=", prixMin);
  if (prixMax !== undefined) query = query.where("prix", "<=", prixMax);

  return query;
};

exports.findMany = async ({ criteres, page, limit }) => {
  let query = buildFilteredQuery(criteres);

  // Firestore impose de trier d'abord sur le champ filtré par intervalle
  if (criteres.prixMin !== undefined || criteres.prixMax !== undefined) {
    query = query.orderBy("prix", "asc");
  }

  const snap = await query
    .orderBy("createdAt", "desc")
    .offset((page - 1) * limit)
    .limit(limit)
    .get();

  return snap.docs;
};

exports.countMany = async (criteres) => {
  const snap = await buildFilteredQuery(criteres).count().get();
  return snap.data().count;
};

exports.update = async (idPublic, changes) => {
  const ref = db.collection("alerte").doc(idPublic);
  await ref.update({ ...changes, updatedAt: Timestamp.now() });
  return (await ref.get()).data();
};

exports.remove = (idPublic) => db.collection("alerte").doc(idPublic).delete();
