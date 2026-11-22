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
  async create(data, context = {}) {
    const { authorRef, increment } = require('./activite.repository');
    const reference = db.collection(MESSAGE_COLLECTION).doc(data.idPublic);
    return db.runTransaction(async tx => {
      const current = await tx.get(reference);
      if (current.exists) return { id: reference.id, data: current.data(), created: false };
      const author = await authorRef(context.role, data.auteurId, tx);
      tx.create(reference, data);
      increment(tx, author, 'messagesEnvoyes');
      if (context.conversationDocumentId) {
        const recipient = context.conversation.idParticipants.find(id => id !== data.auteurId);
        tx.update(db.collection(CONVERSATION_COLLECTION).doc(context.conversationDocumentId), {
          dernierMessage: { contenu: data.contenu, type: data.type, idAuteur: data.auteurId, createdAt: data.createdAt },
          updatedAt: data.createdAt,
          ...(recipient ? { [`nonLus.${recipient}`]: admin.firestore.FieldValue.increment(1) } : {}),
        });
      }
      return { id: reference.id, data, created: true };
    });
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
   * @returns {Promise<string[]>} Identifiants publics des messages passés à « lu ».
   */
  async markMessagesAsRead(
    messages,
    auteurId,
    participants
  ) {
    const batch = db.batch();

    const readMessageIds = [];

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

        readMessageIds.push(data.idPublic);
      }
    }

    if (readMessageIds.length) {
      await batch.commit();
    }
    return readMessageIds;
  }
}

module.exports = new MessageRepository();
