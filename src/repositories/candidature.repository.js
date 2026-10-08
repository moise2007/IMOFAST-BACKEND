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

  query = query.where(
    Filter.or(
      Filter.where(
        "locataireId",
        "==",
        userId
      ),
      Filter.where(
        "bailleurId",
        "==",
        userId
      )
    )
  );

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
async function list({
  filters = {},
  userId,
  role,
}) {
  let query = buildListQuery({
    filters,
    userId,
  });

  const totalSnapshot =
    await query.count().get();

  const total =
    totalSnapshot.data().count;

  if (filters.lastId) {
    const lastSnapshot = await db
      .collection(COLLECTION)
      .where(
        "idPublic",
        "==",
        filters.lastId
      )
      .limit(1)
      .get();

    if (!lastSnapshot.empty) {
      query = query.startAfter(
        lastSnapshot.docs[0]
      );
    }
  }

  const limit =
    filters.pageSize ??
    (role === "locataire" ? 30 : 15);

  const snapshot = await query
    .limit(limit)
    .get();

  const candidatures =
    snapshot.docs.map((document) => ({
      ...document.data(),
      documentId: document.id,
    }));

  return {
    candidatures,
    total,
    hasMore:
      candidatures.length === limit,
    lastId:
      candidatures.length > 0
        ? candidatures[
            candidatures.length - 1
          ].idPublic
        : null,
  };
}

module.exports = {
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