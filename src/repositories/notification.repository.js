const { db, admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Repository responsable de l'accès aux notifications Firestore.
 */
class NotificationRepository {
  /**
   * Recherche une notification appartenant à un destinataire.
   *
   * @param {Object} params
   * @param {string} params.idPublic
   * @param {string} params.destinataireId
   * @returns {Promise<Object|null>}
   */
  async findByPublicIdAndDestinataire({
    idPublic,
    destinataireId,
  }) {
    const snapshot = await db
      .collection("notification")
      .where("idPublic", "==", idPublic)
      .where("destinataireId", "==", destinataireId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      documentId: document.id,
      notification: document.data(),
    };
  }

  /**
   * Marque une notification comme lue.
   *
   * @param {Object} params
   * @param {string} params.documentId
   * @returns {Promise<Object>}
   */
  async markAsRead({ documentId }) {
    const reference = db
      .collection("notification")
      .doc(documentId);

    await reference.update({
      lu: true,
      updatedAt: Timestamp.now(),
    });

    const snapshot = await reference.get();

    return {
      documentId,
      notification: snapshot.data(),
    };
  }
}

module.exports = new NotificationRepository();