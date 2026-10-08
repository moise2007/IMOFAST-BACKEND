const { asyncHandler } = require("../utils/asyncHandler");
const conversationService = require("../services/ApiService/conversation.service");

/**
 * Crée ou réactive une conversation entre l'utilisateur connecté
 * et un autre utilisateur.
 *
 * @route POST /conversations/with/:auteur1Id
 */
const createConversation = asyncHandler(async (req, res) => {
  const { auteur1Id } = req.validatedParams;

  const conversation = await conversationService.createConversation({
    userId: req.user.idPublic,
    role: req.role,
    otherUserId: auteur1Id,
  });

  return res.status(200).json({
    success: true,
    conversation,
  });
});

/**
 * Récupère toutes les conversations de l'utilisateur connecté.
 *
 * @route GET /conversations
 */
const getConversations = asyncHandler(async (req, res) => {
  const conversations = await conversationService.getConversations({
    userId: req.user.idPublic,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    total: conversations.length,
    conversations,
  });
});

/**
 * Récupère une conversation précise.
 *
 * @route GET /conversations/:id
 */
const getConversation = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  const conversation = await conversationService.getConversation({
    conversationId: id,
    userId: req.user.idPublic,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    conversation,
  });
});

/**
 * Masque une conversation pour l'utilisateur connecté.
 *
 * Il s'agit d'une suppression logique :
 * la conversation reste présente pour l'autre participant.
 *
 * @route DELETE /conversations/:id
 */
const deleteConversation = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  await conversationService.deleteConversation({
    conversationId: id,
    userId: req.user.idPublic,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
    message: "Conversation supprimée",
  });
});

/**
 * Marque une conversation comme lue.
 *
 * @route PATCH /conversations/:id/read
 */
const markConversationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  await conversationService.markConversationAsRead({
    conversationId: id,
    userId: req.user.idPublic,
    role: req.role,
  });

  return res.status(200).json({
    success: true,
  });
});

/**
 * Recherche les contacts avec lesquels l'utilisateur
 * peut démarrer une conversation.
 *
 * @route GET /conversations/contacts
 */
const getContacts = asyncHandler(async (req, res) => {
  const { texte, page } = req.validatedQuery;

  const result = await conversationService.getContacts({
    role: req.role,
    texte,
    page,
  });

  return res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  createConversation,
  getConversations,
  getConversation,
  deleteConversation,
  markConversationAsRead,
  getContacts,
};