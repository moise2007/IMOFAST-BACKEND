const { createId } = require("@paralleldrive/cuid2")
const { Conversation } = require("../../models/conversation");
const conversationRepository = require("../../repositories/conversation.repository");

/**
 * Vérifie qu'un utilisateur possède un rôle autorisé
 * pour utiliser le système de conversation.
 *
 * @param {string} role
 * @throws {Error}
 */
const ensureConversationRole = (role) => {
  if (role !== "bailleur" && role !== "locataire") {
    const error = new Error("Role non autorisé");
    error.statusCode = 403;
    error.code = "forbidden";
    throw error;
  }
};

/**
 * Retourne les informations relatives aux participants
 * selon le rôle de l'utilisateur connecté.
 *
 * @param {Object} params
 * @param {"bailleur"|"locataire"} params.role
 * @param {string} params.userId
 * @returns {{
 *   bailleurId: string,
 *   locataireId: string,
 *   otherCollection: string,
 *   otherRole: "bailleur"|"locataire"
 * }}
 */
const getParticipantContext = ({ role, userId }) => {
  if (role === "bailleur") {
    return {
      bailleurId: userId,
      locataireId: null,
      otherCollection: "locataire",
      otherRole: "locataire",
    };
  }

  return {
    bailleurId: null,
    locataireId: userId,
    otherCollection: "bailleur",
    otherRole: "bailleur",
  };
};

/**
 * Crée ou réactive une conversation entre l'utilisateur connecté
 * et un autre utilisateur.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {"bailleur"|"locataire"} params.role
 * @param {string} params.otherUserId
 * @returns {Promise<Object>}
 */
const createConversation = async ({
  userId,
  role,
  otherUserId,
}) => {
  ensureConversationRole(role);

  if (userId === otherUserId) {
    const error = new Error(
      "Un utilisateur ne peut pas créer une conversation avec lui-même"
    );

    error.statusCode = 400;
    error.code = "self_conversation";

    throw error;
  }

  const context = getParticipantContext({
    role,
    userId,
  });

  const bailleurId =
    role === "bailleur" ? userId : otherUserId;

  const locataireId =
    role === "locataire" ? userId : otherUserId;

  const existingConversation =
    await conversationRepository.findByParticipants({
      bailleurId,
      locataireId,
    });

  if (existingConversation) {
    await conversationRepository.update(
      existingConversation.id,
      {
        [`delete.${bailleurId}`]: false,
        [`delete.${locataireId}`]: false,
        updatedAt: new Date(),
      }
    );

    return {
      ...existingConversation.data,
      delete: {
        ...(existingConversation.data.delete || {}),
        [bailleurId]: false,
        [locataireId]: false,
      },
    };
  }

  const otherUser =
    await conversationRepository.findUserByPublicId({
      collectionName: context.otherCollection,
      idPublic: otherUserId,
    });

  if (!otherUser) {
    const error = new Error("Utilisateur introuvable");

    error.statusCode = 404;
    error.code = "user_not_found";

    throw error;
  }

  const conversation = new Conversation({
    idPublic: `con_${createId()}`,
    bailleurId,
    locataireId,
  });

  const data = conversation.toFirebase();

  await conversationRepository.create(data);

  return data;
};

/**
 * Récupère toutes les conversations visibles de l'utilisateur.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {"bailleur"|"locataire"} params.role
 * @returns {Promise<Object[]>}
 */
const getConversations = async ({
  userId,
  role,
}) => {
  ensureConversationRole(role);

  const conversations =
    await conversationRepository.findAllByUser({
      userId,
      role,
    });

  const visibleConversations = conversations.filter(
    ({ data }) => !data.delete?.[userId]
  );

  if (!visibleConversations.length) {
    return [];
  }

  const otherField =
    role === "bailleur" ? "locataireId" : "bailleurId";

  const otherCollection =
    role === "bailleur" ? "locataire" : "bailleur";

  const otherUserIds = visibleConversations.map(
    ({ data }) => data[otherField]
  );

  const users =
    await conversationRepository.findUsersByPublicIds({
      collectionName: otherCollection,
      ids: otherUserIds,
    });

  const usersById = new Map(
    users.map((user) => [user.idPublic, user])
  );

  return visibleConversations.map(({ data }) => {
    const otherUser = usersById.get(data[otherField]);

    return {
      ...data,
      autreParticipant: otherUser
        ? {
            idPublic: otherUser.idPublic,
            nom: otherUser.nom ?? null,
            prenom: otherUser.prenom ?? null,
            photoProfil: otherUser.photoProfil ?? null,
            enligne: otherUser.enligne ?? false,
          }
        : null,
    };
  });
};

/**
 * Récupère une conversation visible par l'utilisateur.
 *
 * La lecture de la conversation remet également le compteur
 * de messages non lus de l'utilisateur à zéro.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {"bailleur"|"locataire"} params.role
 * @returns {Promise<Object>}
 */
const getConversation = async ({
  conversationId,
  userId,
  role,
}) => {
  ensureConversationRole(role);

  const conversation =
    await conversationRepository.findByIdForUser({
      idPublic: conversationId,
      userId,
      role,
    });

  if (!conversation) {
    const error = new Error("Conversation introuvable");

    error.statusCode = 404;
    error.code = "not_found";

    throw error;
  }

  const otherUserId =
    role === "bailleur"
      ? conversation.data.locataireId
      : conversation.data.bailleurId;

  const otherCollection =
    role === "bailleur"
      ? "locataire"
      : "bailleur";

  const otherUser =
    await conversationRepository.findUserByPublicId({
      collectionName: otherCollection,
      idPublic: otherUserId,
    });

  if (!otherUser) {
    const error = new Error("Participant introuvable");

    error.statusCode = 404;
    error.code = "user_not_found";

    throw error;
  }

  await conversationRepository.update(
    conversation.id,
    {
      [`nonLus.${userId}`]: 0,
    }
  );

  return {
    ...conversation.data,

    nonLus: {
      ...(conversation.data.nonLus || {}),
      [userId]: 0,
    },

    autreParticipant: {
      idPublic: otherUser.idPublic,
      nom: otherUser.nom ?? null,
      prenom: otherUser.prenom ?? null,
      photoProfil: otherUser.photoProfil ?? null,
      enligne: otherUser.enligne ?? false,
    },
  };
};

/**
 * Masque une conversation pour l'utilisateur courant.
 *
 * La conversation n'est pas supprimée de Firestore.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {"bailleur"|"locataire"} params.role
 * @returns {Promise<void>}
 */
const deleteConversation = async ({
  conversationId,
  userId,
  role,
}) => {
  ensureConversationRole(role);

  const conversation =
    await conversationRepository.findByIdForUser({
      idPublic: conversationId,
      userId,
      role,
    });

  if (!conversation) {
    const error = new Error("Conversation introuvable");

    error.statusCode = 404;
    error.code = "not_found";

    throw error;
  }

  await conversationRepository.update(
    conversation.id,
    {
      [`delete.${userId}`]: true,
      updatedAt: new Date(),
    }
  );
};

/**
 * Marque une conversation comme lue.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {"bailleur"|"locataire"} params.role
 * @returns {Promise<void>}
 */
const markConversationAsRead = async ({
  conversationId,
  userId,
  role,
}) => {
  ensureConversationRole(role);

  const conversation =
    await conversationRepository.findByIdForUser({
      idPublic: conversationId,
      userId,
      role,
    });

  if (!conversation) {
    const error = new Error("Conversation introuvable");

    error.statusCode = 404;
    error.code = "not_found";

    throw error;
  }

  await conversationRepository.update(
    conversation.id,
    {
      [`nonLus.${userId}`]: 0,
    }
  );
};

/**
 * Recherche les contacts avec lesquels l'utilisateur peut
 * démarrer une conversation.
 *
 * @param {Object} params
 * @param {"bailleur"|"locataire"} params.role
 * @param {string} params.texte
 * @param {number} params.page
 * @param {Object} params.usersCache
 * @returns {Object[]}
 */
const getContacts = ({
  role,
  texte,
  page,
  usersCache,
}) => {
  ensureConversationRole(role);

  const collectionSearch =
    role === "bailleur"
      ? "locataire"
      : "bailleur";

  const users =
    usersCache?.[collectionSearch] || [];

  const search = texte.toLowerCase();

  const filteredUsers = users.filter((user) => {
    if (!search) {
      return true;
    }

    const nom = String(user.nom || "").toLowerCase();
    const prenom = String(user.prenom || "").toLowerCase();
    const email = String(user.email || "").toLowerCase();

    return (
      nom.includes(search) ||
      prenom.includes(search) ||
      email.includes(search)
    );
  });

  const pageSize = 150;
  const start = pageSize * (page - 1);
  const end = start + pageSize;

  const contacts = filteredUsers
    .slice(start, end)
    .map((user) => ({
      type: collectionSearch,
      nom: user.nom ?? null,
      prenom: user.prenom ?? null,
      photoProfil: user.photoProfil ?? null,
      idPublic: user.idPublic ?? null,
    }));

  return {
    contacts,
    isAll: end >= filteredUsers.length,
  };
};

module.exports = {
  createConversation,
  getConversations,
  getConversation,
  deleteConversation,
  markConversationAsRead,
  getContacts,
};