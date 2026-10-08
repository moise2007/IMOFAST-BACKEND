const { db, admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

const MESSAGE_COLLECTION = "message";
const CONVERSATION_COLLECTION = "conversation";

/**
 * Repository responsable de l'accès aux messages.
 */
class MessageRepository {
  /**
   * Recherche une conversation par son identifiant public.
   *
   * @param {string} idPublic
   * @returns {Promise<{id: string, data: Object}|null>}
   */
  async findConversationByPublicId(idPublic) {
    const snapshot = await db
      .collection(CONVERSATION_COLLECTION)
      .where("idPublic", "==", idPublic)
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
   * Recherche un message par son identifiant public et son auteur.
   *
   * @param {Object} params
   * @param {string} params.idPublic
   * @param {string} params.auteurId
   * @returns {Promise<{id: string, data: Object}|null>}
   */
  async findByIdAndAuthor({
    idPublic,
    auteurId,
  }) {
    const snapshot = await db
      .collection(MESSAGE_COLLECTION)
      .where("idPublic", "==", idPublic)
      .where("auteurId", "==", auteurId)
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
   * Recherche un message par son identifiant public.
   *
   * @param {string} idPublic
   * @returns {Promise<{id: string, data: Object}|null>}
   */
  async findByPublicId(idPublic) {
    const snapshot = await db
      .collection(MESSAGE_COLLECTION)
      .where("idPublic", "==", idPublic)
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
   * Recherche le curseur de pagination.
   *
   * @param {string} idPublic
   * @returns {Promise<Object|null>}
   */
  async findDocumentByPublicId(idPublic) {
    const snapshot = await db
      .collection(MESSAGE_COLLECTION)
      .where("idPublic", "==", idPublic)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0];
  }

  /**
   * Récupère les messages d'une conversation.
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {Object|null} params.lastDocument
   * @param {number} params.limit
   * @returns {Promise<Array<{id: string, data: Object}>>}
   */
  async findByConversation({
    conversationId,
    lastDocument = null,
    limit = 30,
  }) {
    let query = db
      .collection(MESSAGE_COLLECTION)
      .where("conversationId", "==", conversationId)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (lastDocument) {
      query = query.startAfter(lastDocument);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((document) => ({
      id: document.id,
      data: document.data(),
      reference: document.ref,
    }));
  }

  /**
   * Crée un message.
   *
   * @param {Object} data
   * @returns {Promise<{id: string, data: Object}>}
   */
  async create(data) {
    const reference = await db
      .collection(MESSAGE_COLLECTION)
      .add(data);

    return {
      id: reference.id,
      data,
    };
  }

  /**
   * Met à jour un message.
   *
   * @param {string} documentId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(documentId, data) {
    await db
      .collection(MESSAGE_COLLECTION)
      .doc(documentId)
      .update({
        ...data,
        updatedAt: Timestamp.now(),
      });
  }

  /**
   * Supprime physiquement un message.
   *
   * @param {string} documentId
   * @returns {Promise<void>}
   */
  async delete(documentId) {
    await db
      .collection(MESSAGE_COLLECTION)
      .doc(documentId)
      .delete();
  }

  /**
   * Marque plusieurs messages comme lus.
   *
   * @param {Array<{reference: Object, data: Object}>} messages
   * @param {string} auteurId
   * @param {string[]} participants
   * @returns {Promise<void>}
   */
  async markMessagesAsRead(
    messages,
    auteurId,
    participants
  ) {
    const batch = db.batch();

    let hasUpdates = false;

    for (const message of messages) {
      const data = message.data;

      const shouldMarkAsRead =
        data.auteurId !== auteurId &&
        data.lu === false &&
        participants.includes(data.auteurId);

      if (shouldMarkAsRead) {
        batch.update(message.reference, {
          lu: true,
        });

        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await batch.commit();
    }
  }
}

module.exports = new MessageRepository();