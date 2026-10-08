const { db, admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Repository responsable de l'accès aux notes Firestore.
 */
class NoteRepository {
  /**
   * Crée une note.
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const reference = await db
      .collection("note")
      .add(data);

    const snapshot = await reference.get();

    return {
      documentId: reference.id,
      note: snapshot.data(),
    };
  }

  /**
   * Recherche une note par son identifiant public.
   *
   * @param {string} idPublic
   * @returns {Promise<Object|null>}
   */
  async findByPublicId(idPublic) {
    const snapshot = await db
      .collection("note")
      .where("idPublic", "==", idPublic)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      documentId: document.id,
      note: document.data(),
    };
  }

  /**
   * Recherche une note appartenant à un auteur.
   *
   * @param {Object} params
   * @param {string} params.idPublic
   * @param {string} params.auteurId
   * @returns {Promise<Object|null>}
   */
  async findByPublicIdAndAuteur({
    idPublic,
    auteurId,
  }) {
    const snapshot = await db
      .collection("note")
      .where("idPublic", "==", idPublic)
      .where("auteurId", "==", auteurId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      documentId: document.id,
      note: document.data(),
    };
  }

  /**
   * Recherche une note déjà attribuée par un auteur
   * à une cible.
   *
   * @param {Object} params
   * @param {string} params.auteurId
   * @param {string} params.cibleId
   * @param {string} params.typeCible
   * @returns {Promise<Object|null>}
   */
  async findByAuteurAndCible({
    auteurId,
    cibleId,
    typeCible,
  }) {
    const snapshot = await db
      .collection("note")
      .where("auteurId", "==", auteurId)
      .where("cibleId", "==", cibleId)
      .where("typeCible", "==", typeCible)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      documentId: document.id,
      note: document.data(),
    };
  }

  /**
   * Recherche les notes selon différents filtres.
   *
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  async findAll(filters = {}) {
    const {
      cibleId,
      typeCible,
      auteurId,
      valeur,
      min,
      max,
      pageSize = 30,
      lastId,
    } = filters;

    let query = db.collection("note");

    if (cibleId) {
      query = query.where(
        "cibleId",
        "==",
        cibleId
      );
    }

    if (typeCible) {
      query = query.where(
        "typeCible",
        "==",
        typeCible
      );
    }

    if (auteurId) {
      query = query.where(
        "auteurId",
        "==",
        auteurId
      );
    }

    if (valeur !== undefined) {
      query = query.where(
        "valeur",
        "==",
        valeur
      );
    }

    if (min !== undefined) {
      query = query.where(
        "valeur",
        ">=",
        min
      );
    }

    if (max !== undefined) {
      query = query.where(
        "valeur",
        "<=",
        max
      );
    }

    /**
     * Pagination Firestore.
     */
    if (lastId) {
      const cursorSnapshot = await db
        .collection("note")
        .where("idPublic", "==", lastId)
        .limit(1)
        .get();

      if (!cursorSnapshot.empty) {
        query = query.startAfter(
          cursorSnapshot.docs[0]
        );
      }
    }

    query = query
      .orderBy("createdAt", "desc")
      .limit(pageSize);

    const snapshot = await query.get();

    const notes = snapshot.docs.map((document) => ({
      documentId: document.id,
      note: document.data(),
    }));

    const lastDocument =
      snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;

    return {
      notes,
      total: notes.length,
      lastId: lastDocument
        ? lastDocument.data().idPublic
        : null,
      hasMore: snapshot.size === pageSize,
    };
  }

  /**
   * Met à jour une note.
   *
   * @param {Object} params
   * @param {string} params.documentId
   * @param {Object} params.data
   * @returns {Promise<Object>}
   */
  async update({
    documentId,
    data,
  }) {
    await db
      .collection("note")
      .doc(documentId)
      .update({
        ...data,
        updatedAt: Timestamp.now(),
      });

    const snapshot = await db
      .collection("note")
      .doc(documentId)
      .get();

    return {
      documentId,
      note: snapshot.data(),
    };
  }

  /**
   * Supprime une note.
   *
   * @param {Object} params
   * @param {string} params.documentId
   * @returns {Promise<void>}
   */
  async delete({ documentId }) {
    await db
      .collection("note")
      .doc(documentId)
      .delete();
  }
}

module.exports = new NoteRepository();