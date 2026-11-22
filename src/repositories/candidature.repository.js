const AppError = require('../errors/AppError');
const { appointmentDate } = require('../utils/candidatureScore');
const { db, admin } = require("../config/firebase");

const { Filter } = admin.firestore;
const Timestamp = admin.firestore.Timestamp;
const FieldValue = admin.firestore.FieldValue;

const COLLECTION = "candidature";

/**
 * Crée une candidature.
 *
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function create(data) {
  const reference = db
    .collection(COLLECTION)
    .doc();

  await reference.set(data);

  return {
    ...data,
    documentId: reference.id,
  };
}

/**
 * Recherche une candidature par son identifiant public.
 *
 * @param {string} idPublic
 * @returns {Promise<Object|null>}
 */
async function findByPublicId(idPublic) {
  const snapshot = await db
    .collection(COLLECTION)
    .where("idPublic", "==", idPublic)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  return {
    ...document.data(),
    documentId: document.id,
  };
}

/**
 * Recherche une candidature accessible à un utilisateur.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.userId
 * @returns {Promise<Object|null>}
 */
async function findByIdAndUser({
  idPublic,
  userId,
}) {
  const snapshot = await db
    .collection(COLLECTION)
    .where(
      Filter.and(
        Filter.where("idPublic", "==", idPublic),
        Filter.or(
          Filter.where(
            "bailleurId",
            "==",
            userId
          ),
          Filter.where(
            "locataireId",
            "==",
            userId
          )
        )
      )
    )
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  if (document.data().delete?.[userId]) return null;
  return {
    ...document.data(),
    documentId: document.id,
  };
}

/**
 * Recherche une candidature en attente
 * appartenant à un bailleur.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.bailleurId
 * @returns {Promise<Object|null>}
 */
async function findPendingByIdAndBailleur({
  idPublic,
  bailleurId,
}) {
  const snapshot = await db
    .collection(COLLECTION)
    .where(
      Filter.and(
        Filter.where("idPublic", "==", idPublic),
        Filter.where(
          "statut",
          "==",
          "en_attente"
        ),
        Filter.where(
          "bailleurId",
          "==",
          bailleurId
        )
      )
    )
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  return {
    ...document.data(),
    documentId: document.id,
  };
}

/**
 * Recherche une candidature en attente
 * appartenant à un locataire.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.locataireId
 * @returns {Promise<Object|null>}
 */
async function findPendingByIdAndLocataire({
  idPublic,
  locataireId,
}) {
  const snapshot = await db
    .collection(COLLECTION)
    .where(
      Filter.and(
        Filter.where("idPublic", "==", idPublic),
        Filter.where(
          "statut",
          "==",
          "en_attente"
        ),
        Filter.where(
          "locataireId",
          "==",
          locataireId
        )
      )
    )
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  return {
    ...document.data(),
    documentId: document.id,
  };
}

/**
 * Recherche une candidature en attente
 * pour une annonce et un locataire.
 *
 * @param {Object} params
 * @param {string} params.annonceId
 * @param {string} params.locataireId
 * @returns {Promise<Object|null>}
 */
async function findPendingByAnnonceAndLocataire({
  annonceId,
  locataireId,
}) {
  const snapshot = await db
    .collection(COLLECTION)
    .where(
      Filter.and(
        Filter.where(
          "annonceId",
          "==",
          annonceId
        ),
        Filter.where(
          "locataireId",
          "==",
          locataireId
        ),
        Filter.where(
          "statut",
          "==",
          "en_attente"
        )
      )
    )
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  return {
    ...document.data(),
    documentId: document.id,
  };
}

/**
 * Recherche une candidature active accessible
 * par le bailleur ou le locataire.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.userId
 * @returns {Promise<Object|null>}
 */
async function findActiveByIdAndUser({
  idPublic,
  userId,
}) {
  const snapshot = await db
    .collection(COLLECTION)
    .where(
      Filter.and(
        Filter.where(
          "idPublic",
          "==",
          idPublic
        ),
        Filter.where(
          "statut",
          "in",
          [
            "visitePrevue",
            "dossierRetenu",
            "en_attente",
          ]
        ),
        Filter.or(
          Filter.where(
            "bailleurId",
            "==",
            userId
          ),
          Filter.where(
            "locataireId",
            "==",
            userId
          )
        )
      )
    )
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  return {
    ...document.data(),
    documentId: document.id,
  };
}

/**
 * Recherche une candidature de type visite
 * appartenant à un bailleur.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.bailleurId
 * @returns {Promise<Object|null>}
 */
async function findVisiteByIdAndBailleur({
  idPublic,
  bailleurId,
}) {
  const snapshot = await db
    .collection(COLLECTION)
    .where(
      Filter.and(
        Filter.where(
          "type",
          "==",
          "visite"
        ),
        Filter.where(
          "idPublic",
          "==",
          idPublic
        ),
        Filter.where(
          "statut",
          "in",
          [
            "en_attente",
            "visitePrevue",
          ]
        ),
        Filter.where(
          "bailleurId",
          "==",
          bailleurId
        )
      )
    )
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  return {
    ...document.data(),
    documentId: document.id,
  };
}

/**
 * Met à jour une candidature.
 *
 * @param {string} documentId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function updateByDocumentId(
  documentId,
  data
) {
  const reference = db
    .collection(COLLECTION)
    .doc(documentId);

  if (data.statut) data = { ...data, historique: FieldValue.arrayUnion({ action: data.statut, date: new Date().toISOString(), type: "info" }) };
  await reference.update(data);

  const snapshot = await reference.get();

  return {
    ...snapshot.data(),
    documentId: snapshot.id,
  };
}

/**
 * Recherche une annonce par son identifiant public.
 *
 * @param {string} idPublic
 * @returns {Promise<Object|null>}
 */
async function findAnnonceByPublicId(idPublic) {
  const snapshot = await db
    .collection("annonce")
    .where("idPublic", "==", idPublic)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data();
}

/**
 * Recherche un bien par son identifiant public.
 *
 * @param {string} idPublic
 * @returns {Promise<Object|null>}
 */
async function findBienByPublicId(idPublic) {
  const snapshot = await db
    .collection("bien")
    .where("idPublic", "==", idPublic)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data();
}

/**
 * Incrémente le nombre de candidatures
 * d'une annonce.
 *
 * @param {string} annonceId
 * @returns {Promise<void>}
 */
async function incrementAnnonceCandidatures(
  annonceId
) {
  const snapshot = await db
    .collection("annonce")
    .where("idPublic", "==", annonceId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return;
  }

  await snapshot.docs[0].ref.update({
    "statistiques.candidatures":
      FieldValue.increment(1),
  });
}

/**
 * Décrémente le nombre de candidatures restantes
 * d'un locataire.
 *
 * @param {string} locataireDocumentId
 * @returns {Promise<void>}
 */
async function decrementLocataireCandidatures(
  locataireDocumentId
) {
  await db
    .collection("locataire")
    .doc(locataireDocumentId)
    .update({
      "candidatures.candidaturesRestantes":
        FieldValue.increment(-1),
    });
}

/**
 * Construit la requête Firestore des candidatures.
 *
 * @param {Object} params
 * @param {Object} params.filters
 * @param {string} params.userId
 * @returns {FirebaseFirestore.Query}
 */
function buildListQuery({
  filters = {},
  userId,
  role,
}) {
  let query = db.collection(COLLECTION);

  if (filters.type) {
    query = query.where(
      "type",
      "==",
      filters.type
    );
  }

  if (filters.statut) {
    query = query.where(
      "statut",
      "==",
      filters.statut
    );
  }

  if (filters.annonceId) {
    query = query.where(
      "annonceId",
      "==",
      filters.annonceId
    );
  }

  if (filters.vu !== undefined) {
    const vu =
      filters.vu === true ||
      filters.vu === "true";

    query = query.where(
      "vu",
      "==",
      vu
    );
  }

  if (filters.minDate) {
    query = query.where(
      "createdAt",
      ">=",
      Timestamp.fromDate(
        new Date(filters.minDate)
      )
    );
  }

  if (filters.maxDate) {
    query = query.where(
      "createdAt",
      "<=",
      Timestamp.fromDate(
        new Date(filters.maxDate)
      )
    );
  }

  query = query.where(role === 'bailleur' ? 'bailleurId' : 'locataireId', '==', userId);

  return query.orderBy(
    "createdAt",
    "desc"
  );
}

/**
 * Récupère les candidatures avec pagination.
 *
 * @param {Object} params
 * @param {Object} params.filters
 * @param {string} params.userId
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
async function list({ filters = {}, userId, role }) {
  const query = buildListQuery({ filters, userId, role });
  // The delete map has dynamic keys; filtering it in Firestore would require per-user composite indexes.
  const limit = filters.pageSize ?? (role === 'locataire' ? 30 : 15);
  const candidatures = [];
  let cursor, total = 0, afterCursor = !filters.lastId, hasMore = false;
  do {
    const snapshot = await (cursor ? query.startAfter(cursor) : query).limit(200).get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.delete?.[userId]) continue;
      total++;
      if (!afterCursor) { if (data.idPublic === filters.lastId) afterCursor = true; continue; }
      if (candidatures.length < limit) candidatures.push({ ...data, documentId: doc.id });
      else hasMore = true;
    }
    cursor = snapshot.docs.length === 200 ? snapshot.docs.at(-1) : null;
  } while (cursor);
  if (!afterCursor) throw new AppError('errors:backend.invalidCursor', 400);
  return { candidatures, total, hasMore, lastId: candidatures.at(-1)?.idPublic ?? null };
}
async function createAtomic(data, { userId }) {
  const userRef = db.collection('locataire').doc(userId);
  const reference = db.collection(COLLECTION).doc(data.idPublic);
  return db.runTransaction(async tx => {
    const [userDoc, listings, pending] = await Promise.all([
      tx.get(userRef), tx.get(db.collection('annonce').where('idPublic', '==', data.annonceId).limit(1)),
      tx.get(db.collection(COLLECTION).where('annonceId', '==', data.annonceId).where('locataireId', '==', data.locataireId).where('statut', '==', 'en_attente')),
    ]);
    const listing = listings.docs[0];
    if (!userDoc.exists || !listing || listing.data().status !== 'publier' || listing.data().estPubliee === false || (listing.data().dateExpiration && +new Date(listing.data().dateExpiration) <= Date.now()))
      throw new AppError('errors:backend.notFound', 404);
    const user = userDoc.data();
    const fin = user.forfait?.fin;
    const end = fin?.toMillis?.() ?? ((fin?.seconds ?? fin?._seconds) != null ? (fin.seconds ?? fin._seconds) * 1000 : +new Date(fin));
    const paid = ['mensuel', 'trimestriel', 'annuel'].includes(user.forfait?.type) && end > Date.now();
    if (!paid && !(user.forfait?.type === 'aucun' && user.candidatures?.candidaturesRestantes > 0))
      throw new AppError('errors:backend.quota', 409);
    for (const doc of pending.docs) tx.update(doc.ref, { statut: 'annuler', updatedAt: Timestamp.now() });
    tx.create(reference, data);
    tx.update(listing.ref, { 'statistiques.candidatures': FieldValue.increment(1) });
    if (!paid) tx.update(userRef, { 'candidatures.candidaturesRestantes': FieldValue.increment(-1) });
    return data;
  });
}
async function markRead({ idPublic, userId }) {
  return db.runTransaction(async tx => {
    const found = await tx.get(db.collection(COLLECTION).where('idPublic', '==', idPublic).limit(1));
    const doc = found.docs[0];
    if (!doc || doc.data().bailleurId !== userId || doc.data().delete?.[userId]) throw new AppError('errors:backend.notFound', 404);
    if (!doc.data().vu) tx.update(doc.ref, { vu: true, luAt: Timestamp.now() });
    return { ...doc.data(), vu: true };
  });
}
async function setAttendance({ idPublic, userId, role, honore, message, now = new Date() }) {
  return db.runTransaction(async tx => {
    const found = await tx.get(db.collection(COLLECTION).where('idPublic', '==', idPublic).limit(1));
    const doc = found.docs[0], data = doc?.data();
    if (!data || !['bailleur', 'locataire'].includes(role) || data[`${role}Id`] !== userId || data.delete?.[userId])
      throw new AppError('errors:backend.notFound', 404);
    const appointment = appointmentDate(data.visite);
    if (data.type !== 'visite' || data.statut !== 'visitePrevue') throw new AppError('errors:backend.visitNotAccepted', 409);
    if (!appointment || +appointment >= +now) throw new AppError('errors:backend.visitNotPast', 409);
    const declaration = { honore, message: message || null, date: now.toISOString() };
    tx.update(doc.ref, { [`honoree.${role}`]: declaration, updatedAt: Timestamp.now() });
    return { ...data, honoree: { ...data.honoree, [role]: declaration } };
  });
}
async function candidateProfile(locataireId) {
  const users = await db.collection('locataire').where('idPublic', '==', locataireId).limit(1).get();
  const user = users.docs[0]?.data();
  if (!user) throw new AppError('errors:backend.notFound', 404);
  const applications = db.collection(COLLECTION).where('locataireId', '==', locataireId);
  const count = async q => (await q.count().get()).data().count;
  const [candidatures, visites, visitesHonorees, votes] = await Promise.all([
    count(applications), count(applications.where('type', '==', 'visite').where('statut', '==', 'visitePrevue')),
    count(applications.where('type', '==', 'visite').where('honoree.bailleur.honore', '==', true).where('honoree.locataire.honore', '==', true)),
    db.collection('note').where('typeCible', '==', 'locataire').where('cibleId', '==', locataireId).get(),
  ]);
  const ownerIds = new Set();
  const ids = [...new Set(votes.docs.map(d => d.data().auteurId))];
  for (let i = 0; i < ids.length; i += 30) {
    const owners = await db.collection('bailleur').where('idPublic', 'in', ids.slice(i, i + 30)).get();
    owners.docs.forEach(d => ownerIds.add(d.data().idPublic));
  }
  const birth = user.dateNaissance?.toDate?.() ?? new Date(user.dateNaissance);
  const today = new Date();
  let age = user.dateNaissance && Number.isFinite(+birth) ? today.getUTCFullYear() - birth.getUTCFullYear() : null;
  if (age !== null && (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate()))) age--;
  return { idPublic: locataireId, nom: user.nom, prenom: user.prenom, photoProfil: user.photoProfil,
    candidatures, visites, visitesHonorees, notes: votes.docs.map(d => d.data()).filter(n => ownerIds.has(n.auteurId)).map(n => ({ auteurId: n.auteurId, valeur: n.valeur, createdAt: n.createdAt })),
    metier: user.metier || null, age, telephone: user.telephone || null };
}

module.exports = {
  createAtomic, markRead, setAttendance, candidateProfile,
  create,
  findByPublicId,
  findByIdAndUser,
  findPendingByIdAndBailleur,
  findPendingByIdAndLocataire,
  findPendingByAnnonceAndLocataire,
  findActiveByIdAndUser,
  findVisiteByIdAndBailleur,
  updateByDocumentId,
  findAnnonceByPublicId,
  findBienByPublicId,
  incrementAnnonceCandidatures,
  decrementLocataireCandidatures,
  list,
};