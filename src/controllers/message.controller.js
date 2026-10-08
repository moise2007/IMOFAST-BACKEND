const { asyncHandler } = require("../utils/asyncHandler");
const messageService = require("../services/ApiService/message.service");

/**
 * Envoie un message dans une conversation.
 *
 * @route POST /messages
 */
const sendMessage = asyncHandler(async (req, res) => {
  const message = await messageService.sendMessage({
    ...req.validatedBody,
    auteurId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    message,
    msg: req.t("success.message_created", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère les messages d'une conversation.
 *
 * @route GET /messages/:id
 */
const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;
  const { lastId } = req.validatedQuery;

  const result = await messageService.getMessages({
    conversationId: id,
    auteurId: req.user.idPublic,
    lastId,
  });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.message_created", {
      ns: "responses",
    }),
  });
});

/**
 * Supprime un message.
 *
 * @route DELETE /messages/:id
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  await messageService.deleteMessage({
    messageId: id,
    auteurId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    msg: req.t("success.message_deleted", {
      ns: "responses",
    }),
  });
});

/**
 * Modifie un message.
 *
 * @route PATCH /messages/:id
 */
const updateMessage = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  const message = await messageService.updateMessage({
    messageId: id,
    auteurId: req.user.idPublic,
    data: req.validatedBody,
  });

  return res.status(200).json({
    success: true,
    message,
    msg: req.t("success.message_updated", {
      ns: "responses",
    }),
  });
});

module.exports = {
  sendMessage,
  getMessages,
  deleteMessage,
  updateMessage,
};