const express = require("express");

const {
  authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const notificationController = require("../controllers/notification.controller");

const {
  validate,
  createNotificationSchema,
  notificationIdSchema,
  getNotificationsSchema,
} = require("../validators/notification.validator");

const routerNotification = express.Router();

/**
 * Créer une notification.
 *
 * POST /notifications
 */
routerNotification.post(
  "/",
  authBailleurLocataireAdmin,
  validate(createNotificationSchema),
  notificationController.createNotification
);

/**
 * Récupérer les notifications du destinataire connecté.
 *
 * GET /notifications
 */
routerNotification.get(
  "/",
  authBailleurLocataireAdmin,
  validate(getNotificationsSchema, "query"),
  notificationController.getNotifications
);

/**
 * Marquer toutes les notifications comme lues.
 *
 * PATCH /notifications/read-all
 */
routerNotification.patch(
  "/read-all",
  authBailleurLocataireAdmin,
  notificationController.setAllLuNotification
);

/**
 * Marquer une notification comme lue.
 *
 * PATCH /notifications/:id/read
 */
routerNotification.patch(
  "/:id/read",
  authBailleurLocataireAdmin,
  validate(notificationIdSchema, "params"),
  notificationController.setLuNotification
);

/**
 * Supprimer une notification.
 *
 * DELETE /notifications/:id
 */
routerNotification.delete(
  "/:id",
  authBailleurLocataireAdmin,
  validate(notificationIdSchema, "params"),
  notificationController.deleteNotification
);

module.exports = {
  routerNotification,
};