const express = require("express");

const {
  authBailleurLocataire,
  authBailleurLocataireAdmin,
} = require("../middlewares/auth");

const notificationController = require("../controllers/notification.controller");

const {
  validate,
  createNotificationSchema,
  notificationIdSchema,
  getNotificationsSchema,
} = require("../validators/notification.validator");

const {z} = require("zod");
const {isPushEndpoint} = require("../notifications/push/messagePush");
const routerNotification = express.Router();

const webSubscription = z.object({
  account: z.string().min(1),
  web: z.object({
    endpoint: z.string().max(4096).refine(isPushEndpoint),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/),
      auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
    }),
  }),
});
routerNotification.post('/subscribe', authBailleurLocataire, validate(webSubscription), notificationController.subscribe);
routerNotification.delete('/subscribe', authBailleurLocataire, validate(z.object({ endpoint: z.string().url().max(4096) })), notificationController.unsubscribe);
const preferenceFields = Object.fromEntries(Object.keys(require('../utils/notificationPreferences').DEFAULT_NOTIFICATION_PREFERENCES).map(key => [key, z.boolean().optional()]));
routerNotification.get('/preferences', authBailleurLocataire, notificationController.getPreferences);
routerNotification.patch('/preferences', authBailleurLocataire, validate(z.object(preferenceFields).strict()), notificationController.setPreferences);

/**
 * Créer une notification.
 *
 * POST /notifications
 */
routerNotification.post(
  "/",
  authBailleurLocataireAdmin,
  (req, res, next) => req.role === "admin" ? next() : res.status(403).json({ success: false }),
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
