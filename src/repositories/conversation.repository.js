const { admin } = require("../config/firebase");

const db = admin.firestore();

const CONVERSATION_COLLECTION = "conversation";

/**
 * Repository responsable de l'accès aux conversations dans Firestore.
 */
class ConversationRepository {
  /**
   * Recherche une conversation entre un bailleur et un locataire.
   *
   * @param {Object} params
   * @param {string} params.bailleurId
   * @param {string} params.locataireId
   * @returns {Promise<{
   *   id: string,
   *   data: Object
   * }|null>}
   */
  async findByParticipants({ bailleurId, locataireId }) {
    const snapshot = await db
      .collection(CONVERSATION_COLLECTION)
      .where("bailleurId", "==", bailleurId)
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
   * Recherche une conversation visible par un utilisateur.
   *
   * @param {Object} params
   * @param {string} params.idPublic
   * @param {string} params.userId
   * @param {"bailleur"|"locataire"} params.role
   * @returns {Promise<{
   *   id: string,
   *   data: Object
   * }|null>}
   */
  async findByIdForUser({ idPublic, userId, role }) {
    const participantField =
      role === "bailleur" ? "bailleurId" : "locataireId";

    const snapshot = await db
      .collection(CONVERSATION_COLLECTION)
      .where("idPublic", "==", idPublic)
      .where(participantField, "==", userId)
      .where(`delete.${userId}`, "==", false)
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
   * Récupère toutes les conversations d'un utilisateur.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {"bailleur"|"locataire"} params.role
   * @returns {Promise<Array<{id: string, data: Object}>>}
   */
  async findAllByUser({ userId, role }) {
    const participantField =
      role === "bailleur" ? "bailleurId" : "locataireId";

    const snapshot = await db
      .collection(CONVERSATION_COLLECTION)
      .where(participantField, "==", userId)
      .orderBy("updatedAt", "desc")
      .get();

    return snapshot.docs.map((document) => ({
      id: document.id,
      data: document.data(),
    }));
  }

  /**
   * Recherche un utilisateur dans une collection.
   *
   * @param {Object} params
   * @param {string} params.collectionName
   * @param {string} params.idPublic
   * @returns {Promise<Object|null>}
   */
  async findUserByPublicId({ collectionName, idPublic }) {
    const snapshot = await db
      .collection(collectionName)
      .where("idPublic", "==", idPublic)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data();
  }

  /**
   * Recherche plusieurs utilisateurs par leurs identifiants publics.
   *
   * Firestore limite le nombre de valeurs utilisées avec `in`.
   * Les identifiants sont donc découpés en lots.
   *
   * @param {Object} params
   * @param {string} params.collectionName
   * @param {string[]} params.ids
   * @returns {Promise<Object[]>}
   */
  async findUsersByPublicIds({ collectionName, ids }) {
    if (!ids.length) {
      return [];
    }

    const uniqueIds = [...new Set(ids)];
    const chunkSize = 30;
    const users = [];

    for (let index = 0; index < uniqueIds.length; index += chunkSize) {
      const chunk = uniqueIds.slice(index, index + chunkSize);

      const snapshot = await db
        .collection(collectionName)
        .where("idPublic", "in", chunk)
        .get();

      users.push(...snapshot.docs.map((document) => document.data()));
    }

    return users;
  }

  /**
   * Crée une nouvelle conversation.
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const reference = await db
      .collection(CONVERSATION_COLLECTION)
      .add(data);

    return {
      id: reference.id,
      data,
    };
  }

  /**
   * Met à jour une conversation à partir de l'identifiant Firestore.
   *
   * @param {string} documentId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(documentId, data) {
    await db
      .collection(CONVERSATION_COLLECTION)
      .doc(documentId)
      .update(data);
  }
}

module.exports = new ConversationRepository();