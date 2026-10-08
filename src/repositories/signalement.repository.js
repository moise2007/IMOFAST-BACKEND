const { db } = require("../config/firebase");

/**
 * Repository responsable de l'accès aux signalements Firestore.
 */
class SignalementRepository {
  /**
   * Recherche un signalement par son identifiant public.
   *
   * @param {string} idPublic
   * @returns {Promise<Object|null>}
   */
  async findByPublicId(idPublic) {
    const snapshot = await db
      .collection("signalement")
      .where("idPublic", "==", idPublic)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      documentId: document.id,
      signalement: {
        ...document.data(),
      },
    };
  }

  /**
   * Recherche un signalement appartenant à un auteur.
   *
   * @param {Object} params
   * @param {string} params.idPublic
   * @param {string} params.idAuteur
   * @returns {Promise<Object|null>}
   */
  async findByPublicIdAndAuteur({ idPublic, idAuteur }) {
    const snapshot = await db
      .collection("signalement")
      .where("idPublic", "==", idPublic)
      .where("idAuteur", "==", idAuteur)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      documentId: document.id,
      signalement: {
        ...document.data(),
      },
    };
  }

  /**
   * Recherche un signalement existant pour éviter les doublons.
   *
   * @param {Object} params
   * @param {string} params.idAuteur
   * @param {string} params.idCible
   * @param {string} params.typeCible
   * @param {string} params.raison
   * @returns {Promise<Object|null>}
   */
  async findDuplicate({
    idAuteur,
    idCible,
    typeCible,
    raison,
  }) {
    const snapshot = await db
      .collection("signalement")
      .where("idAuteur", "==", idAuteur)
      .where("idCible", "==", idCible)
      .where("typeCible", "==", typeCible)
      .where("raison", "==", raison)
      .where("statut", "==", "en_attente")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      documentId: document.id,
      signalement: document.data(),
    };
  }

  /**
   * Crée un signalement.
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const reference = await db
      .collection("signalement")
      .add(data);

    const snapshot = await reference.get();

    return {
      documentId: reference.id,
      signalement: snapshot.data(),
    };
  }

  /**
   * Recherche les signalements selon plusieurs filtres.
   *
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async findAll(filters = {}) {
    const {
      typeCible,
      idCible,
      raison,
      statut,
      idAuteur,
      pageSize = 30,
      lastId,
    } = filters;

    let query = db.collection("signalement");

    if (typeCible) {
      query = query.where("typeCible", "==", typeCible);
    }

    if (idCible) {
      query = query.where("idCible", "==", idCible);
    }

    if (raison) {
      query = query.where("raison", "==", raison);
    }

    if (statut) {
      query = query.where("statut", "==", statut);
    }

    if (idAuteur) {
      query = query.where("idAuteur", "==", idAuteur);
    }

    query = query
      .orderBy("createdAt", "desc")
      .limit(pageSize);

    /**
     * Pour utiliser un curseur Firestore proprement,
     * on récupère le document correspondant à lastId.
     */
    if (lastId) {
      const cursor = await db
        .collection("signalement")
        .where("idPublic", "==", lastId)
        .limit(1)
        .get();

      if (!cursor.empty) {
        query = query.startAfter(cursor.docs[0]);
      }
    }

    const snapshot = await query.get();

    const signalements = snapshot.docs.map((document) => ({
      documentId: document.id,
      signalement: document.data(),
    }));

    const lastDocument =
      snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;

    return {
      signalements,
      lastId: lastDocument
        ? lastDocument.data().idPublic
        : null,
      hasMore: snapshot.size === pageSize,
    };
  }

  /**
   * Met à jour un signalement.
   *
   * @param {Object} params
   * @param {string} params.documentId
   * @param {Object} params.data
   * @returns {Promise<Object>}
   */
  async update({ documentId, data }) {
    await db
      .collection("signalement")
      .doc(documentId)
      .update(data);

    const snapshot = await db
      .collection("signalement")
      .doc(documentId)
      .get();

    return {
      documentId,
      signalement: snapshot.data(),
    };
  }

  /**
   * Supprime un signalement.
   *
   * @param {string} documentId
   * @returns {Promise<void>}
   */
  async delete(documentId) {
    await db
      .collection("signalement")
      .doc(documentId)
      .delete();
  }
}

module.exports = new SignalementRepository();