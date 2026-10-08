const { db, admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

const FAVORI_COLLECTION = "favoris";
const ANNONCE_COLLECTION = "annonce";
const BIEN_COLLECTION = "bien";

/**
 * Repository responsable de l'accès aux favoris.
 */
class FavoriRepository {
  /**
   * Recherche un favori appartenant à un locataire
   * pour une annonce donnée.
   *
   * @param {Object} params
   * @param {string} params.annonceId
   * @param {string} params.locataireId
   * @returns {Promise<{id: string, data: Object}|null>}
   */
  async findByAnnonceAndLocataire({
    annonceId,
    locataireId,
  }) {
    const snapshot = await db
      .collection(FAVORI_COLLECTION)
      .where("annonceId", "==", annonceId)
      .where("locataireId", "==", locataireId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      id: document.id,
      data: document.data(),
    };
  }

  /**
   * Recherche un favori par son identifiant public
   * appartenant au locataire courant.
   *
   * @param {Object} params
   * @param {string} params.idPublic
   * @param {string} params.locataireId
   * @returns {Promise<{id: string, data: Object}|null>}
   */
  async findByIdAndLocataire({
    idPublic,
    locataireId,
  }) {
    const snapshot = await db
      .collection(FAVORI_COLLECTION)
      .where("idPublic", "==", idPublic)
      .where("locataireId", "==", locataireId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      id: document.id,
      data: document.data(),
    };
  }

  /**
   * Récupère les favoris d'un locataire.
   *
   * @param {Object} params
   * @param {string} params.locataireId
   * @returns {Promise<Array<{id: string, data: Object}>>}
   */
  async findAllByLocataire({ locataireId }) {
    const snapshot = await db
      .collection(FAVORI_COLLECTION)
      .where("locataireId", "==", locataireId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((document) => ({
      id: document.id,
      data: document.data(),
    }));
  }

  /**
   * Récupère une annonce par son identifiant public.
   *
   * @param {string} idPublic
   * @returns {Promise<Object|null>}
   */
  async findAnnonceByPublicId(idPublic) {
    const snapshot = await db
      .collection(ANNONCE_COLLECTION)
      .where("idPublic", "==", idPublic)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return {
      id: snapshot.docs[0].id,
      data: snapshot.docs[0].data(),
    };
  }

  /**
   * Récupère plusieurs annonces par leurs identifiants publics.
   *
   * @param {string[]} ids
   * @returns {Promise<Object[]>}
   */
  async findAnnoncesByPublicIds(ids) {
    return this.findDocumentsByPublicIds(
      ANNONCE_COLLECTION,
      ids
    );
  }

  /**
   * Récupère plusieurs biens par leurs identifiants publics.
   *
   * @param {string[]} ids
   * @returns {Promise<Object[]>}
   */
  async findBiensByPublicIds(ids) {
    return this.findDocumentsByPublicIds(
      BIEN_COLLECTION,
      ids
    );
  }

  /**
   * Recherche plusieurs documents par `idPublic`.
   *
   * Firestore limite les valeurs utilisées avec `in`.
   *
   * @param {string} collectionName
   * @param {string[]} ids
   * @returns {Promise<Object[]>}
   */
  async findDocumentsByPublicIds(collectionName, ids) {
    if (!ids.length) {
      return [];
    }

    const uniqueIds = [...new Set(ids)];
    const chunkSize = 30;
    const results = [];

    for (
      let index = 0;
      index < uniqueIds.length;
      index += chunkSize
    ) {
      const chunk = uniqueIds.slice(
        index,
        index + chunkSize
      );

      const snapshot = await db
        .collection(collectionName)
        .where("idPublic", "in", chunk)
        .get();

      results.push(
        ...snapshot.docs.map((document) => document.data())
      );
    }

    return results;
  }

  /**
   * Crée un favori.
   *
   * @param {Object} data
   * @returns {Promise<{id: string, data: Object}>}
   */
  async create(data) {
    const reference = await db
      .collection(FAVORI_COLLECTION)
      .add(data);

    return {
      id: reference.id,
      data,
    };
  }

  /**
   * Supprime un favori.
   *
   * @param {string} documentId
   * @returns {Promise<void>}
   */
  async delete(documentId) {
    await db
      .collection(FAVORI_COLLECTION)
      .doc(documentId)
      .delete();
  }

  /**
   * Incrémente le nombre de favoris d'une annonce.
   *
   * @param {string} documentId
   * @returns {Promise<void>}
   */
  async incrementAnnonceFavoris(documentId) {
    await db
      .collection(ANNONCE_COLLECTION)
      .doc(documentId)
      .update({
        "statistiques.favoris":
          admin.firestore.FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      });
  }

  /**
   * Décrémente le nombre de favoris d'une annonce.
   *
   * La valeur ne descend pas sous zéro.
   *
   * @param {string} documentId
   * @param {number} currentCount
   * @returns {Promise<void>}
   */
  async decrementAnnonceFavoris(
    documentId,
    currentCount
  ) {
    const nextCount = Math.max(
      0,
      (currentCount || 0) - 1
    );

    await db
      .collection(ANNONCE_COLLECTION)
      .doc(documentId)
      .update({
        "statistiques.favoris": nextCount,
        updatedAt: Timestamp.now(),
      });
  }
}

module.exports = new FavoriRepository();