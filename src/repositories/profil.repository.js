const { db } = require("../config/firebase");

const MAX_ANNONCES = 15;
const FIRESTORE_IN_LIMIT = 30;

class ProfilRepository {
    /**
     * Recherche un profil par son identifiant public.
     *
     * @param {"bailleur"|"locataire"} role
     * @param {string} idPublic
     * @returns {Promise<Object|null>}
     */
    async findProfil(role, idPublic) {
        const snapshot = await db
            .collection(role)
            .where("idPublic", "==", idPublic)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const document = snapshot.docs[0];

        return {
            documentId: document.id,
            ...document.data(),
        };
    }

    /**
     * Récupère les annonces d'un bailleur.
     *
     * @param {string} bailleurId
     * @returns {Promise<Array<Object>>}
     */
    async findAnnoncesByBailleur(bailleurId) {
        const snapshot = await db
            .collection("annonce")
            .where("bailleurId", "==", bailleurId)
            .orderBy("createdAt", "desc")
            .limit(MAX_ANNONCES)
            .get();

        return snapshot.docs.map((doc) => ({
            documentId: doc.id,
            ...doc.data(),
        }));
    }

    /**
     * Récupère les biens associés aux annonces.
     *
     * @param {Array<string>} idsBien
     * @returns {Promise<Array<Object>>}
     */
    async findBiensByPublicIds(idsBien) {
        if (!idsBien.length) {
            return [];
        }

        const chunks = [];

        for (
            let index = 0;
            index < idsBien.length;
            index += FIRESTORE_IN_LIMIT
        ) {
            chunks.push(
                idsBien.slice(index, index + FIRESTORE_IN_LIMIT)
            );
        }

        const snapshots = await Promise.all(
            chunks.map((chunk) =>
                db
                    .collection("bien")
                    .where("idPublic", "in", chunk)
                    .get()
            )
        );

        return snapshots.flatMap((snapshot) =>
            snapshot.docs.map((doc) => ({
                documentId: doc.id,
                ...doc.data(),
            }))
        );
    }
}

module.exports = new ProfilRepository();