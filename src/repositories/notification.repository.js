const { db, admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Repository responsable de l'accès aux notifications Firestore.
 */
class NotificationRepository {
  async createOnce(data, eventKey) {
    const id = require('node:crypto').createHash('sha256')
      .update(JSON.stringify([eventKey, data.typeDestinataire, data.destinataireId])).digest('hex');
    const ref = db.collection('notification').doc(id);
    return db.runTransaction(async tx => {
      const existing = await tx.get(ref);
      if (existing.exists) return { notification: existing.data(), created: false };
      const notification = { ...data, idPublic: id };
      tx.create(ref, notification);
      return { notification, created: true };
    });
  }

  async create(data) {
    const reference = await db.collection("notification").add(data);
    return { documentId: reference.id, notification: data };
  }

  async findLatestByDestinataire(destinataireId) {
    const snapshot = await db.collection("notification")
      .where("destinataireId", "==", destinataireId)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    return snapshot.docs.map((document) => document.data());
  }

  async findAllByDestinataire({ destinataireId, pageSize = 30, lastId, lu }) {
    let query = db.collection("notification")
      .where("destinataireId", "==", destinataireId);
    if (typeof lu === "boolean") query = query.where("lu", "==", lu);
    query = query.orderBy("createdAt", "desc");

    if (lastId) {
      const cursor = await this.findByPublicIdAndDestinataire({ idPublic: lastId, destinataireId });
      if (!cursor) {
        const error = new Error("errors:backend.invalidCursor");
        error.statusCode = 400;
        throw error;
      }
      const cursorSnapshot = await db.collection("notification").doc(cursor.documentId).get();
      query = query.startAfter(cursorSnapshot);
    }

    const snapshot = await query.limit(pageSize + 1).get();
    const documents = snapshot.docs.slice(0, pageSize);
    return {
      notifications: documents.map((document) => document.data()),
      hasMore: snapshot.docs.length > pageSize,
      lastId: documents.at(-1)?.data().idPublic ?? null,
    };
  }

  async delete({ documentId }) {
    await db.collection("notification").doc(documentId).delete();
  }

  async markAllAsRead({ destinataireId }) {
    const snapshot = await db.collection("notification")
      .where("destinataireId", "==", destinataireId)
      .where("lu", "==", false)
      .get();
    for (let index = 0; index < snapshot.docs.length; index += 400) {
      const batch = db.batch();
      snapshot.docs.slice(index, index + 400).forEach((document) => {
        batch.update(document.ref, { lu: true, updatedAt: Timestamp.now() });
      });
      await batch.commit();
    }
    return snapshot.docs.length;
  }

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
