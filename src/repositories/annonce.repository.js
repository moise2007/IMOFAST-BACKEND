const { db, admin } = require("../config/firebase");

/**
 * Collection principale des annonces.
 */
const annonceCollection = db.collection("annonce");

/**
 * Collection des biens.
 */
const bienCollection = db.collection("bien");

/**
 * Collection des bailleurs.
 */
const bailleurCollection = db.collection("bailleur");

/**
 * Collection des favoris.
 */
const favorisCollection = db.collection("favoris");

/**
 * Collection des candidatures.
 */
const candidatureCollection = db.collection("candidature");

/**
 * Récupère un bien appartenant à un bailleur.
 *
 * Cette méthode permet notamment de vérifier qu'un bailleur
 * ne peut créer une annonce que pour l'un de ses propres biens.
 *
 * @param {string} bienId Identifiant public du bien.
 * @param {string} bailleurId Identifiant public du bailleur.
 * @returns {Promise<Object|null>} Le bien trouvé ou null.
 */
exports.findBienByIdAndBailleur = async (bienId, bailleurId) => {
  const snapshot = await bienCollection
    .where("idPublic", "==", bienId)
    .where("bailleurId", "==", bailleurId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data();
};

/**
 * Compte les annonces associées à un bien et à un bailleur.
 *
 * @param {string} bienId Identifiant public du bien.
 * @param {string} bailleurId Identifiant public du bailleur.
 * @returns {Promise<number>} Nombre d'annonces.
 */
exports.countByBienAndBailleur = async (bienId, bailleurId) => {
  const snapshot = await annonceCollection
    .where("bienId", "==", bienId)
    .where("bailleurId", "==", bailleurId)
    .count()
    .get();

  return snapshot.data().count;
};

/**
 * Crée une annonce dans Firestore.
 *
 * @param {Object} annonce Annonce à enregistrer.
 * @returns {Promise<Object>} Annonce créée.
 */
exports.create = async (annonce) => {
  const bien = await exports.findBienById(annonce.bienId);
  const batch = db.batch();
  batch.create(annonceCollection.doc(), annonce);
  require('./annonce-keywords.repository').writeIndex(batch, annonce, bien || {});
  await batch.commit();
  return annonce;
};

/**
 * Récupère une annonce par son identifiant public.
 *
 * @param {string} idPublic Identifiant public.
 * @returns {Promise<Object|null>} Annonce trouvée ou null.
 */
exports.findByIdPublic = async (idPublic) => {
  const snapshot = await annonceCollection
    .where("idPublic", "==", idPublic)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log("c'est vide")
    return null;
  }

  return snapshot.docs[0].data();
};

/**
 * Récupère un bien par son identifiant public.
 *
 * @param {string} idPublic Identifiant public du bien.
 * @returns {Promise<Object|null>} Bien trouvé ou null.
 */
exports.findBienById = async (idPublic) => {
  const snapshot = await bienCollection
    .where("idPublic", "==", idPublic)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data();
};

/**
 * Récupère un bailleur par son identifiant public.
 *
 * @param {string} idPublic Identifiant public du bailleur.
 * @returns {Promise<Object|null>} Bailleur trouvé ou null.
 */
exports.findBailleurByPublicId = async (idPublic) => {
  const snapshot = await bailleurCollection
    .where("idPublic", "==", idPublic)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data();
};

/**
 * Vérifie si une annonce est présente dans les favoris
 * d'un locataire.
 *
 * @param {Object} params
 * @param {string} params.annonceId Identifiant public de l'annonce.
 * @param {string} params.locataireId Identifiant public du locataire.
 * @returns {Promise<boolean>} true si l'annonce est dans les favoris.
 */
exports.existsFavori = async ({ annonceId, locataireId }) => {
  const snapshot = await favorisCollection
    .where("annonceId", "==", annonceId)
    .where("locataireId", "==", locataireId)
    .limit(1)
    .get();

  return !snapshot.empty;
};

/**
 * Récupère plusieurs annonces avec pagination.
 *
 * @param {Object} params
 * @param {Object} params.criteres Critères de recherche.
 * @param {number} params.page Numéro de page.
 * @param {number} params.limit Nombre d'éléments par page.
 * @returns {Promise<Array>} Documents Firestore.
 */
// Property criteria belong to the bien collection, not to the annonce document.
const queryGroups = async (criteria) => {
  let propertyQuery = bienCollection;
  let propertyFiltered = false;
  for (const [key, field] of Object.entries({ ville: "localisation.ville", quartier: "localisation.quartier", typeBien: "typeBien", type: "type", nature: "nature" })) {
    if (criteria[key] == null || criteria[key] === "") continue;
    propertyFiltered = true;
    if (["ville", "quartier"].includes(key)) {
      const value = criteria[key];
      const variants = [...new Set([value, value.replace(/(^|\s)\S/g, letter => letter.toUpperCase())])];
      propertyQuery = propertyQuery.where(field, "in", variants);
    } else propertyQuery = propertyQuery.where(field, "==", criteria[key]);
  }
  for (const [key, field] of Object.entries({ nombreChambre: "chambres.nombre", nombreDouche: "salleBains.nombre" })) {
    if (criteria[key] != null) { propertyFiltered = true; propertyQuery = propertyQuery.where(field, ">=", criteria[key]); }
  }
  let groups = [null];
  if (propertyFiltered) {
    const properties = await propertyQuery.get();
    const ids = properties.docs.map(doc => doc.data().idPublic).filter(Boolean);
    groups = [];
    // Two location `in` filters have already been applied in the separate property query.
    for (let index = 0; index < ids.length; index += 30) groups.push(ids.slice(index, index + 30));
  }
  return groups.map(ids => {
    let query = annonceCollection;
    if (ids) query = query.where("bienId", "in", ids);
    for (const field of ["bailleurId", "devise", "status"]) if (criteria[field] != null) query = query.where(field, "==", criteria[field]);
    if (criteria.natureAnnonce) query = query.where("nature", "==", criteria.natureAnnonce);
    if (criteria.prixMin != null) query = query.where("recherche.minPrix", ">=", criteria.prixMin);
    if (criteria.prixMax != null) query = query.where("recherche.minPrix", "<=", criteria.prixMax);
    const search = criteria.search || criteria.titre;
    const searchWord = search?.toLowerCase().match(/[\p{L}\p{N}]{3,}/u)?.[0] ?? search?.trim().toLowerCase();
    if (searchWord) query = query.where("recherche.motCles", "array-contains", searchWord);
    return query;
  });
};

exports.findPage = async ({ criteres = {}, page = 1, limit = 10 }) => {
  if (['search', 'titre', 'devise', 'ville', 'quartier', 'typeBien', 'type', 'nature', 'natureAnnonce', 'prixMin', 'prixMax', 'duree', 'nombreDurees', 'nombreChambre', 'nombreDouche'].some(k => criteres[k] != null && criteres[k] !== ''))
    return require('./annonce-keywords.repository').search({ criteres, page, limit });
  const queries = await queryGroups(criteres);
  const sort = criteres.sort ?? "recent";
  const priceFilter = criteres.prixMin != null || criteres.prixMax != null;
  const field = sort.startsWith("prix") || priceFilter ? "recherche.minPrix" : sort === "populaire" ? "statistiques.vues" : "createdAt";
  const direction = sort === "prixCroissant" ? "asc" : "desc";
  const [snapshots, counts] = await Promise.all([
    Promise.all(queries.map(query => query.orderBy(field, direction).orderBy(admin.firestore.FieldPath.documentId()).limit(page * limit).get())),
    Promise.all(queries.map(query => query.count().get())),
  ]);
  const value = doc => field.split('.').reduce((value, key) => value?.[key], doc.data());
  const number = val => val?.toMillis ? val.toMillis() : val ?? 0;
  const docs = snapshots.flatMap(snapshot => snapshot.docs).sort((a,b) => {
    const difference = number(value(a)) - number(value(b));
    return (direction === 'asc' ? difference : -difference) || a.id.localeCompare(b.id);
  });
  return { annonces: docs.slice((page - 1) * limit, page * limit).map(doc => doc.data()), totalItems: counts.reduce((total,snapshot) => total + snapshot.data().count, 0) };
};
exports.findMany = async params => (await exports.findPage(params)).annonces;
exports.countMany = async ({ criteres = {} }) => {
  const queries = await queryGroups(criteres);
  const snapshots = await Promise.all(queries.map(query => query.count().get()));
  return snapshots.reduce((sum, snapshot) => sum + snapshot.data().count, 0);
};

/**
 * Met à jour une annonce.
 *
 * @param {string} idPublic Identifiant public de l'annonce.
 * @param {Object} data Données à modifier.
 * @returns {Promise<Object>} Données mises à jour.
 */
exports.update = async (idPublic, data) => db.runTransaction(async tx => {
  const snapshot = await tx.get(annonceCollection.where('idPublic', '==', idPublic).limit(1));
  const document = snapshot.docs[0];
  if (!document) return null;
  const bienSnapshot = await tx.get(bienCollection.where('idPublic', '==', document.data().bienId).limit(1));
  const merged = { ...document.data(), ...data, updatedAt: admin.firestore.Timestamp.now() };
  if (data.loyer) {
    const prices = (Array.isArray(data.loyer) ? data.loyer : [data.loyer]).map(p => p.prix);
    merged.recherche = { ...merged.recherche, minPrix: Math.min(...prices), maxPrix: Math.max(...prices) };
  }
  tx.update(document.ref, merged);
  require('./annonce-keywords.repository').writeIndex(tx, merged, bienSnapshot.docs[0]?.data() || {});
  return merged;
});

/**
 * Supprime une annonce ainsi que ses données dépendantes.
 *
 * Les favoris et candidatures associés sont supprimés
 * dans des opérations batch.
 *
 * @param {string} idPublic Identifiant public de l'annonce.
 * @returns {Promise<void>}
 */
exports.remove = async (idPublic) => {
  const batch = db.batch();

  const annonceSnapshot = await annonceCollection
    .where("idPublic", "==", idPublic)
    .limit(1)
    .get();

  if (annonceSnapshot.empty) {
    return;
  }

  /**
   * Suppression de l'annonce.
   */
  const annonceDocument = annonceSnapshot.docs[0];

  batch.delete(annonceDocument.ref);
  batch.delete(db.collection("annonce_motscles").doc(idPublic));

  /**
   * Suppression des favoris associés.
   */
  const favorisSnapshot = await favorisCollection
    .where("annonceId", "==", idPublic)
    .get();

  favorisSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  /**
   * Suppression des candidatures associées.
   */
  const candidatureSnapshot = await candidatureCollection
    .where("annonceId", "==", idPublic)
    .get();

  candidatureSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};
exports.favorisForAnnonces = async (ids, locataireId) => {
  const found = new Map();
  for (let index = 0; index < ids.length; index += 30) {
    const result = await favorisCollection.where("locataireId", "==", locataireId).where("annonceId", "in", ids.slice(index, index + 30)).get();
    result.docs.forEach(doc => found.set(doc.data().annonceId, doc.data()));
  }
  return found;
};

exports.findByBien = async bienId => {
  const snapshot = await annonceCollection.where("bienId", "==", bienId).get();
  return snapshot.docs.map(doc => { const a = doc.data(); return { idPublic: a.idPublic, titre: a.titre, status: a.status }; });
};
