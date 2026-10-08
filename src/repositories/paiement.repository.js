const { db } = require("../config/firebase");

class PaiementRepository {
    /**
     * Crée un paiement.
     *
     * @param {string} reference
     * @param {Object} data
     * @returns {Promise<Object>}
     */
    async create(reference, data) {
        await db
            .collection("paiement")
            .doc(reference)
            .set(data);

        return {
            reference,
            data,
        };
    }

    /**
     * Recherche un paiement par référence.
     *
     * @param {string} reference
     * @returns {Promise<Object|null>}
     */
    async findByReference(reference) {
        const document = await db
            .collection("paiement")
            .doc(reference)
            .get();

        if (!document.exists) {
            return null;
        }

        return {
            documentId: document.id,
            ...document.data(),
        };
    }

    /**
     * Met à jour un paiement.
     *
     * @param {string} reference
     * @param {Object} data
     * @returns {Promise<void>}
     */
    async update(reference, data) {
        await db
            .collection("paiement")
            .doc(reference)
            .update({
                ...data,
                updatedAt: new Date(),
            });
    }

    /**
     * Récupère le compte d'un utilisateur.
     *
     * @param {"bailleur"|"locataire"} role
     * @param {string} userId
     * @returns {Promise<Object|null>}
     */
    async findUtilisateur(role, userId) {
        const document = await db
            .collection(role)
            .doc(userId)
            .get();

        if (!document.exists) {
            return null;
        }

        return {
            documentId: document.id,
            ...document.data(),
        };
    }

    /**
     * Met à jour le forfait d'un utilisateur.
     *
     * @param {"bailleur"|"locataire"} role
     * @param {string} userId
     * @param {Object} forfait
     * @returns {Promise<void>}
     */
    async updateForfait(role, userId, forfait) {
        await db
            .collection(role)
            .doc(userId)
            .update({
                forfait,
                updatedAt: new Date(),
            });
    }
}

module.exports = new PaiementRepository();