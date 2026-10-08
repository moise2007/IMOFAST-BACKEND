const { db, admin } = require("../config/firebase");

const COLLECTION = "bien";
const ANNONCE_COLLECTION = "annonce";
const FAVORIS_COLLECTION = "favoris";
const CANDIDATURE_COLLECTION = "candidature";

const BATCH_SIZE = 400;

/**
 * Recherche un bien par son identifiant public.
 *
 * @param {string} idPublic
 * @returns {Promise<Object|null>}
 */
const findByPublicId = async (idPublic) => {
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
    bien: document.data(),
    documentId: document.id,
  };
};

/**
 * Recherche un bien appartenant à un bailleur.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.bailleurId
 * @returns {Promise<Object|null>}
 */
const findByPublicIdAndBailleur = async ({
  idPublic,
  bailleurId,
}) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("idPublic", "==", idPublic)
    .where("bailleurId", "==", bailleurId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  return {
    bien: document.data(),
    documentId: document.id,
  };
};

/**
 * Crée plusieurs biens avec des batches Firestore.
 *
 * @param {Object[]} biens
 * @returns {Promise<Object[]>}
 */
const createMany = async (biens) => {
  const created = [];

  for (
    let start = 0;
    start < biens.length;
    start += BATCH_SIZE
  ) {
    const batch = db.batch();

    const chunk = biens.slice(
      start,
      start + BATCH_SIZE
    );

    const documents = chunk.map((bien) => {
      const ref =
        db.collection(COLLECTION).doc();

      batch.set(ref, bien);

      return {
        bien,
        documentId: ref.id,
      };
    });

    await batch.commit();

    created.push(...documents);
  }

  return created;
};

/**
 * Met à jour un bien.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.bailleurId
 * @param {string} [params.documentId]
 * @param {Object} [params.currentBien]
 * @param {Object} params.data
 * @returns {Promise<Object|null>}
 */
const updateByPublicId = async ({
  idPublic,
  bailleurId,
  documentId,
  currentBien,
  data,
}) => {
  let ref = documentId
    ? db
        .collection(COLLECTION)
        .doc(documentId)
    : null;

  let latestBien = currentBien;

  if (!ref) {
    const result =
      await findByPublicIdAndBailleur({
        idPublic,
        bailleurId,
      });

    if (!result) {
      return null;
    }

    ref = db
      .collection(COLLECTION)
      .doc(result.documentId);

    latestBien = result.bien;
  }

  const updateAt =
    admin.firestore.Timestamp.now();

  const updated = {
    ...latestBien,
    ...data,
    updateAt,
  };

  await ref.update({
    ...data,
    updateAt,
  });

  return {
    bien: updated,
    documentId: ref.id,
  };
};

/**
 * Supprime un bien ainsi que les annonces
 * et données dépendantes.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.bailleurId
 * @param {string} [params.documentId]
 * @returns {Promise<Object|null>}
 */
const deleteByPublicId = async ({
  idPublic,
  bailleurId,
  documentId,
}) => {
  let bienDocument = null;

  if (documentId) {
    const document = await db
      .collection(COLLECTION)
      .doc(documentId)
      .get();

    if (
      document.exists &&
      document.data()?.idPublic === idPublic &&
      document.data()?.bailleurId === bailleurId
    ) {
      bienDocument = document;
    }
  } else {
    const result =
      await findByPublicIdAndBailleur({
        idPublic,
        bailleurId,
      });

    if (result) {
      bienDocument = await db
        .collection(COLLECTION)
        .doc(result.documentId)
        .get();
    }
  }

  if (!bienDocument) {
    return null;
  }

  const annoncesSnapshot = await db
    .collection(ANNONCE_COLLECTION)
    .where("bienId", "==", idPublic)
    .where("bailleurId", "==", bailleurId)
    .get();

  const annonces =
    annoncesSnapshot.docs.map(
      (doc) => doc.data()
    );

  /**
   * Suppression des favoris et candidatures
   * liés aux annonces du bien.
   */
  for (const annonce of annonces) {
    await deleteAllByQuery(
      db
        .collection(FAVORIS_COLLECTION)
        .where(
          "annonceId",
          "==",
          annonce.idPublic
        )
    );

    await deleteAllByQuery(
      db
        .collection(CANDIDATURE_COLLECTION)
        .where(
          "annonceId",
          "==",
          annonce.idPublic
        )
    );
  }

  const annonceDocuments =
    annoncesSnapshot.docs;

  /**
   * Suppression des annonces et du bien.
   */
  if (annonceDocuments.length > 0) {
    for (
      let start = 0;
      start < annonceDocuments.length;
      start += BATCH_SIZE
    ) {
      const batch = db.batch();

      const chunk =
        annonceDocuments.slice(
          start,
          start + BATCH_SIZE
        );

      chunk.forEach((document) => {
        batch.delete(document.ref);
      });

      if (
        start + BATCH_SIZE >=
        annonceDocuments.length
      ) {
        batch.delete(bienDocument.ref);
      }

      await batch.commit();
    }
  } else {
    const batch = db.batch();

    batch.delete(bienDocument.ref);

    await batch.commit();
  }

  return {
    bien: bienDocument.data(),
    annonces,
  };
};

/**
 * Supprime tous les documents correspondant
 * à une requête Firestore.
 *
 * @param {FirebaseFirestore.Query} query
 * @returns {Promise<void>}
 */
const deleteAllByQuery = async (query) => {
  while (true) {
    const snapshot = await query
      .limit(BATCH_SIZE)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();

    snapshot.docs.forEach((document) => {
      batch.delete(document.ref);
    });

    await batch.commit();

    if (snapshot.size < BATCH_SIZE) {
      break;
    }
  }
};

/**
 * Construit la requête Firestore correspondant
 * aux filtres de recherche.
 *
 * @param {Object} filters
 * @returns {FirebaseFirestore.Query}
 */
const buildListQuery = (filters = {}) => {
  let query = db.collection(COLLECTION);

  const typeField = [
    "bureau",
    "boutique",
    "terrain",
  ].includes(filters.type)
    ? "typeBien"
    : "type";

  const equalityFilters = [
    ["bailleurId", filters.bailleurId],
    ["nature", filters.nature],
    [typeField, filters.type],
    ["mode", filters.mode],
    ["niveauFinition", filters.niveau],
    [
      "localisation.ville",
      filters.ville,
    ],
    [
      "localisation.quatier",
      filters.quartier,
    ],
    [
      "chambres.nombre",
      filters.nombreChambre,
    ],
    [
      "salleBains.nombre",
      filters.nombreSalleBain,
    ],
    [
      "equipements.wifi",
      filters.wifi,
    ],
    [
      "equipements.televiseur",
      filters.televiseur,
    ],
    [
      "equipements.parking",
      filters.parking,
    ],
    [
      "equipements.piscine",
      filters.piscine,
    ],
    [
      "equipements.ascenseur",
      filters.ascenseur,
    ],
    [
      "equipements.refrigerateur",
      filters.refrigerateur,
    ],
    [
      "equipements.cuisineEquipee",
      filters.cuisine,
    ],
    [
      "securite.camera",
      filters.camera,
    ],
    [
      "securite.barriere",
      filters.barriere,
    ],
    [
      "environements.hopital",
      filters.hopital,
    ],
    [
      "environements.ecole",
      filters.ecole,
    ],
    [
      "environements.marche",
      filters.marche,
    ],
  ];

  for (const [field, value] of equalityFilters) {
    if (
      value !== undefined &&
      value !== ""
    ) {
      query = query.where(
        field,
        "==",
        value
      );
    }
  }

  if (
    filters.superficie !== undefined
  ) {
    query = query.where(
      "superficie",
      ">=",
      Number(filters.superficie)
    );
  }

  if (
    filters.etageMax !== undefined
  ) {
    query = query.where(
      "etage.max",
      "<=",
      Number(filters.etageMax)
    );
  }

  return query;
};

/**
 * Récupère les biens selon les filtres
 * avec pagination.
 *
 * @param {Object} filters
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=10]
 * @returns {Promise<Object>}
 */
const list = async (filters = {}) => {
  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 10);

  const query = buildListQuery(filters);

  /**
   * Le total est calculé indépendamment de la
   * pagination afin de construire les métadonnées.
   */
  const totalSnapshot = await query.get();

  const total = totalSnapshot.size;

  const offset =
    (page - 1) * limit;

  /**
   * La pagination est appliquée après le tri.
   */
  const snapshot = await query
    .orderBy("createdAt", "desc")
    .offset(offset)
    .limit(limit)
    .get();

  const items = snapshot.docs.map(
    (document) => ({
      bien: document.data(),
      documentId: document.id,
    })
  );

  return {
    items,

    pagination: {
      page,
      limit,
      total,
    },
  };
};

module.exports = {
  findByPublicId,
  findByPublicIdAndBailleur,
  createMany,
  updateByPublicId,
  deleteByPublicId,
  deleteAllByQuery,
  list,
};