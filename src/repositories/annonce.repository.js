const { db, admin } = require("../config/firebase");

/**
 * Collection principale des annonces.
 */
const annonceCollection = db.collection("annonces");

/**
 * Collection des biens.
 */
const bienCollection = db.collection("biens");

/**
 * Collection des bailleurs.
 */
const bailleurCollection = db.collection("bailleurs");

/**
 * Collection des favoris.
 */
const favorisCollection = db.collection("favoris");

/**
 * Collection des candidatures.
 */
const candidatureCollection = db.collection("candidatures");

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
  await annonceCollection.doc(annonce.idPublic).set({
    ...annonce,
  });

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
exports.findMany = async ({ criteres = {}, page, limit }) => {
  let query = annonceCollection;

  /**
   * Application des critères Firestore.
   *
   * Les critères qui ne correspondent pas directement
   * à une propriété Firestore peuvent être traités dans
   * le service.
   */
  Object.entries(criteres).forEach(([field, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      typeof value !== "object"
    ) {
      query = query.where(field, "==", value);
    }
  });

  /**
   * Tri par date de création.
   */
  query = query.orderBy("createdAt", "desc");

  /**
   * Pagination.
   */
  const offset = (page - 1) * limit;

  if (offset > 0) {
    const previousSnapshot = await query.limit(offset).get();

    if (!previousSnapshot.empty) {
      const lastDocument =
        previousSnapshot.docs[previousSnapshot.docs.length - 1];

      query = query.startAfter(lastDocument);
    }
  }

  const snapshot = await query.limit(limit).get();

  return snapshot.docs.map((doc) => doc.data());
};

/**
 * Compte le nombre total d'annonces correspondant aux critères.
 *
 * @param {Object} params
 * @param {Object} params.criteres Critères Firestore.
 * @returns {Promise<number>} Nombre total d'annonces.
 */
exports.countMany = async ({ criteres = {} }) => {
  let query = annonceCollection;

  Object.entries(criteres).forEach(([field, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      typeof value !== "object"
    ) {
      query = query.where(field, "==", value);
    }
  });

  const snapshot = await query.count().get();

  return snapshot.data().count;
};

/**
 * Met à jour une annonce.
 *
 * @param {string} idPublic Identifiant public de l'annonce.
 * @param {Object} data Données à modifier.
 * @returns {Promise<Object>} Données mises à jour.
 */
exports.update = async (idPublic, data) => {
  const snapshot = await annonceCollection
    .where("idPublic", "==", idPublic)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  await document.ref.update({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    ...document.data(),
    ...data,
  };
};

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