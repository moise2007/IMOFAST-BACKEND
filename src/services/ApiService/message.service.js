const { createId } = require("@paralleldrive/cuid2");

const {db} = require("../../config/firebase");
const {notifyNewMessage} = require("../../notifications/push/messagePush");
const {messageNotificationTitle} = require("../../notifications/messageTitle");
const { Message } = require("../../models/message");
const messageRepository = require("../../repositories/message.repository");

/**
 * Vérifie qu'un utilisateur appartient à une conversation.
 *
 * @param {Object} conversation
 * @param {string} userId
 * @returns {boolean}
 */
const isConversationParticipant = (
  conversation,
  userId
) => {
  return conversation.idParticipants?.includes(userId);
};

/**
 * Vérifie qu'une conversation existe et que
 * l'utilisateur courant en est participant.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @returns {Promise<Object>}
 */
const getAuthorizedConversation = async ({
  conversationId,
  userId,
}) => {
  const conversation =
    await messageRepository.findConversationByPublicId(
      conversationId
    );

  if (!conversation) {
    const error = new Error(
      "errors:backend.notFound"
    );

    error.statusCode = 404;
    error.code = "conversation_not_found";

    throw error;
  }

  if (
    !isConversationParticipant(
      conversation.data,
      userId
    )
  ) {
    const error = new Error(
      "errors:backend.forbidden"
    );

    error.statusCode = 403;
    error.code = "forbidden";

    throw error;
  }

  return conversation;
};

/**
 * Envoie un message dans une conversation.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.auteurId
 * @param {Object} params.data
 * @returns {Promise<Object>}
 */
const sendMessage = async ({
  conversationId,
  auteurId,
  auteur,
  messageId,
  data,
}) => {
  const conversation = await getAuthorizedConversation({
    conversationId,
    userId: auteurId,
  });

  /**
   * Si le message est une réponse, vérifier
   * que le message parent existe dans la même conversation.
   */
  if (data.repondsA) {
    const parentMessage =
      await messageRepository.findByPublicId(
        data.repondsA
      );

    if (
      !parentMessage ||
      parentMessage.data.conversationId !==
        conversationId
    ) {
      const error = new Error(
        "errors:backend.notFound"
      );

      error.statusCode = 404;
      error.code = "parent_message_not_found";

      throw error;
    }
  }

  const message = new Message({
    ...data,
    conversationId,
    auteurId,
    idPublic: messageId || createId(),
  });

  const messageData = message.toFirebase();

  const createdMessage =
    await messageRepository.create(messageData, {
      role: auteurId === conversation.data.bailleurId ? 'bailleur' : 'locataire', auteurId,
      conversationDocumentId: conversation.id, conversation: conversation.data,
    });

  if (createdMessage.created === false) return createdMessage.data;
  const toOwner = auteurId === conversation.data.locataireId;
  const recipientRole = toOwner ? "bailleur" : "locataire";
  const recipientId = toOwner ? conversation.data.bailleurId : conversation.data.locataireId;
  const notificationTitle = messageNotificationTitle(auteur);
  void notifyNewMessage({db, conversationId, recipientRole, recipientId, title: notificationTitle, sender: auteur});
  void Promise.resolve().then(() => require("../notification.service").createNotification({
    destinataireId: recipientId,
    typeDestinataire: recipientRole,
    type: "message",
    cibleId: conversationId,
    typeCible: "conversation",
    titreKey: 'backend.push.messageTitle',
    message: typeof createdMessage.data?.contenu === "string" && createdMessage.data.contenu.trim()
      ? createdMessage.data.contenu.slice(0, 160)
      : undefined,
    messageKey: 'backend.push.messageBody',
  })).catch((error) => console.error("Notification du message :", error));
  return createdMessage.data;
};

/**
 * Récupère les messages d'une conversation.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.auteurId
 * @param {string} [params.lastId]
 * @returns {Promise<Object>}
 */
const getMessages = async ({
  conversationId,
  auteurId,
  lastId,
}) => {
  const conversation =
    await getAuthorizedConversation({
      conversationId,
      userId: auteurId,
    });

  let lastDocument = null;

  if (lastId) {
    lastDocument =
      await messageRepository.findDocumentByPublicId(
        lastId
      );

    if (!lastDocument) {
      const error = new Error(
        "errors:backend.notFound"
      );

      error.statusCode = 404;
      error.code = "not_found";

      throw error;
    }
  }

  const messages =
    await messageRepository.findByConversation({
      conversationId,
      lastDocument,
      limit: 30,
    });

  /**
   * Marquer comme lus les messages reçus.
   */
  const readMessageIds = await messageRepository.markMessagesAsRead(
    messages,
    auteurId,
    conversation.data.idParticipants || []
  );
  const newlyReadIds = new Set(readMessageIds);

  return {
    messages: messages.map(
      ({ data }) => newlyReadIds.has(data.idPublic) ? { ...data, lu: true } : data
    ),
    hasMore: messages.length === 30,
    readMessageIds,
    otherUserId: conversation.data.idParticipants?.find(id => id !== auteurId),
  };
};

/**
 * Supprime un message appartenant à l'utilisateur courant.
 *
 * @param {Object} params
 * @param {string} params.messageId
 * @param {string} params.auteurId
 * @returns {Promise<void>}
 */
const deleteMessage = async ({
  messageId,
  auteurId,
}) => {
  const message =
    await messageRepository.findByIdAndAuthor({
      idPublic: messageId,
      auteurId,
    });

  if (!message) {
    const error = new Error(
      "errors:backend.notFound"
    );

    error.statusCode = 404;
    error.code = "message_not_found";

    throw error;
  }

  /**
   * Vérifier que le message appartient à une
   * conversation dont l'utilisateur est participant.
   */
  await getAuthorizedConversation({
    conversationId: message.data.conversationId,
    userId: auteurId,
  });

  await messageRepository.delete(message.id);
};

/**
 * Modifie un message.
 *
 * La modification est autorisée pendant 10 minutes
 * après la création du message.
 *
 * @param {Object} params
 * @param {string} params.messageId
 * @param {string} params.auteurId
 * @param {Object} params.data
 * @returns {Promise<Object>}
 */
const updateMessage = async ({
  messageId,
  auteurId,
  data,
}) => {
  const message =
    await messageRepository.findByIdAndAuthor({
      idPublic: messageId,
      auteurId,
    });

  if (!message) {
    const error = new Error(
      "errors:backend.notFound"
    );

    error.statusCode = 404;
    error.code = "message_not_found";

    throw error;
  }

  await getAuthorizedConversation({
    conversationId: message.data.conversationId,
    userId: auteurId,
  });

  const now = Date.now();

  const expiredAt =
    message.data.expiredAt?.toMillis?.() ??
    new Date(message.data.expiredAt).getTime();

  if (now > expiredAt) {
    const error = new Error(
      "errors:backend.editExpired"
    );

    error.statusCode = 403;
    error.code = "message_edit_forbidden";

    throw error;
  }

  const updateData = {};

  if (data.type !== undefined) {
    updateData.type = data.type;
  }

  if (data.contenu !== undefined) {
    updateData.contenu = data.contenu;
  }

  await messageRepository.update(
    message.id,
    updateData
  );

  const updatedMessage =
    await messageRepository.findByPublicId(
      messageId
    );

  return updatedMessage.data;
};

module.exports = {
  sendMessage,
  getMessages,
  deleteMessage,
  updateMessage,
};
