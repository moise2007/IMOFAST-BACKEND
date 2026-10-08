const { asyncHandler } = require("../utils/asyncHandler");

const notificationService = require("../services/ApiService/notification.service");

/**
 * Crée une notification.
 *
 * @route POST /notifications
 */
const createNotification = asyncHandler(async (req, res) => {
  const notification =
    await notificationService.createNotification({
      data: req.validatedBody,
    });

  return res.status(201).json({
    success: true,
    notification,
    msg: req.t("success.create_notification", {
      ns: "responses",
    }),
  });
});

/**
 * Récupère les notifications du destinataire connecté.
 *
 * @route GET /notifications
 */
const getNotifications = asyncHandler(async (req, res) => {
  const result =
    await notificationService.getNotifications({
      destinataireId: req.user.idPublic,
      filters: req.validatedQuery,
    });

  return res.status(200).json({
    success: true,
    ...result,
    msg: req.t("success.get_notification", {
      ns: "responses",
    }),
  });
});

/**
 * Supprime une notification du destinataire connecté.
 *
 * @route DELETE /notifications/:id
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  await notificationService.deleteNotification({
    idPublic: id,
    destinataireId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    msg: req.t("success.delete_notification", {
      ns: "responses",
    }),
  });
});

/**
 * Marque une notification comme lue.
 *
 * @route PATCH /notifications/:id/read
 */
const setLuNotification = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;

  await notificationService.markAsRead({
    idPublic: id,
    destinataireId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    msg: req.t("success.mark_as_notification", {
      ns: "responses",
    }),
  });
});

/**
 * Marque toutes les notifications du destinataire comme lues.
 *
 * @route PATCH /notifications/read-all
 */
const setAllLuNotification = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead({
    destinataireId: req.user.idPublic,
  });

  return res.status(200).json({
    success: true,
    msg: req.t("success.mark_all_as_notification", {
      ns: "responses",
    }),
  });
});

module.exports = {
  createNotification,
  getNotifications,
  deleteNotification,
  setLuNotification,
  setAllLuNotification,
};