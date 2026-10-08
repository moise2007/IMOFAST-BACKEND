const { db } = require("../config/firebase");

class ServiceClientRepository {
    /**
     * Crée un document dans une collection.
     *
     * @param {string} collection
     * @param {Object} data
     * @returns {Promise<Object>}
     */
    async create(collection, data) {
        const reference = await db
            .collection(collection)
            .add(data);

        const snapshot = await reference.get();

        return {
            documentId: reference.id,
            data: snapshot.data(),
        };
    }

    /**
     * Récupère un document par son identifiant public.
     *
     * @param {string} collection
     * @param {string} idPublic
     * @returns {Promise<Object|null>}
     */
    async findByPublicId(collection, idPublic) {
        const snapshot = await db
            .collection(collection)
            .where("idPublic", "==", idPublic)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const document = snapshot.docs[0];

        return {
            documentId: document.id,
            data: document.data(),
        };
    }

    /**
     * Récupère toutes les demandes d'un utilisateur.
     *
     * @param {string} userId
     * @returns {Promise<Array>}
     */
    async findAllByUser(userId) {
        const [
            messagesSnapshot,
            reclamationsSnapshot,
            signalementsSnapshot,
        ] = await Promise.all([
            db
                .collection("message_user")
                .where("userId", "==", userId)
                .get(),

            db
                .collection("reclamation")
                .where("userId", "==", userId)
                .get(),

            db
                .collection("signalement")
                .where("userId", "==", userId)
                .get(),
        ]);

        const messages = messagesSnapshot.docs.map((doc) => ({
            id: doc.id,
            type: "message",
            ...doc.data(),
        }));

        const reclamations = reclamationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            type: "reclamation",
            ...doc.data(),
        }));

        const signalements = signalementsSnapshot.docs.map((doc) => ({
            id: doc.id,
            type: "signalement",
            ...doc.data(),
        }));

        return [
            ...messages,
            ...reclamations,
            ...signalements,
        ];
    }
}

module.exports = new ServiceClientRepository();