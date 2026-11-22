const { createId } = require("@paralleldrive/cuid2");

const { Notification } = require("../../models/notification");
const notificationRepository = require("../../repositories/notification.repository");

/**
 * Crée une erreur métier avec un code HTTP.
 *
 * @param {string} message
 * @param {number} [statusCode=400]
 * @throws {Error}
 */
const createBusinessError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  throw error;
};

/**
 * Crée une notification.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @returns {Promise<Object>}
 */
const createNotification = async ({ data }) => {
  const notification = new Notification({
    ...data,
    idPublic: createId(),
  });

  const result = await notificationRepository.create(
    notification.toFirebase()
  );

  return result.notification;
};

/**
 * Récupère les notifications d'un utilisateur.
 *
 * @param {Object} params
 * @param {string} params.destinataireId
 * @param {Object} [params.filters={}]
 * @returns {Promise<Object>}
 */
const getNotifications = async ({
  destinataireId,
}) => {
  const notifications = await notificationRepository.findLatestByDestinataire(destinataireId);
  return { notifications };
};

/**
 * Supprime une notification appartenant au destinataire.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.destinataireId
 * @returns {Promise<void>}
 */
const deleteNotification = async ({
  idPublic,
  destinataireId,
}) => {
  const result =
    await notificationRepository.findByPublicIdAndDestinataire({
      idPublic,
      destinataireId,
    });

  if (!result) {
    createBusinessError(
      "errors:backend.notFound",
      404
    );
  }

  await notificationRepository.delete({
    documentId: result.documentId,
  });
};

/**
 * Marque une notification comme lue.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {string} params.destinataireId
 * @returns {Promise<Object>}
 */
const markAsRead = async ({
  idPublic,
  destinataireId,
}) => {
  const result =
    await notificationRepository.findByPublicIdAndDestinataire({
      idPublic,
      destinataireId,
    });

  if (!result) {
    createBusinessError(
      "errors:backend.notFound",
      404
    );
  }

  /**
   * Si la notification est déjà lue,
   * aucune écriture Firestore n'est nécessaire.
   */
  if (result.notification.lu) {
    return result.notification;
  }

  const updated =
    await notificationRepository.markAsRead({
      documentId: result.documentId,
    });

  return updated.notification;
};

/**
 * Marque toutes les notifications d'un utilisateur
 * comme lues.
 *
 * @param {Object} params
 * @param {string} params.destinataireId
 * @returns {Promise<number>}
 */
const markAllAsRead = async ({
  destinataireId,
}) => {
  const updatedCount =
    await notificationRepository.markAllAsRead({
      destinataireId,
    });

  return updatedCount;
};

const subscriptionRepository = require('../../repositories/subscription.repository');
const AppError = require('../../errors/AppError');
const { DEFAULT_NOTIFICATION_PREFERENCES } = require('../../utils/notificationPreferences');
async function subscribe({ account, web, user, role }) {
  if (account !== `${role}:${user.idPublic}`) throw new AppError('errors:backend.accountMismatch', 409);
  return subscriptionRepository.updateSubscriptions({ role, userId: user.id, subscription: web });
}
module.exports = {
  subscribe,
  unsubscribe: ({ user, role, endpoint }) => subscriptionRepository.updateSubscriptions({ role, userId: user.id, endpoint }),
  getPreferences: user => ({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...user.notificationPreferences }),
  setPreferences: ({ user, role, preferences }) => subscriptionRepository.setPreferences({ role, userId: user.id, preferences }),
  createNotification,
  createNotificationOnce: ({ data, eventKey }) => notificationRepository.createOnce(
    new Notification({ ...data, idPublic: createId() }).toFirebase(), eventKey),
  getNotifications,
  deleteNotification,
  markAsRead,
  markAllAsRead,
};
