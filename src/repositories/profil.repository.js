const { db } = require("../config/firebase");

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
    async getCandidatureSummary(idPublic) {
        const snapshot = await db.collection("candidature")
            .where("locataireId", "==", idPublic).select("statut").get();
        const counts = {};
        for (const doc of snapshot.docs) {
            const status = doc.data().statut ?? "en_attente";
            counts[status] = (counts[status] ?? 0) + 1;
        }
        return { total: snapshot.size, counts };
    }

    async findAnnoncesByBailleur(bailleurId) {
        const snapshot = await db
            .collection("annonce")
            .where("bailleurId", "==", bailleurId)
            .get();

        return snapshot.docs.map((doc) => ({
            documentId: doc.id,
            ...doc.data(),
        })).filter(annonce => annonce.status === "publier")
            .sort((a, b) => (b.createdAt?.seconds ?? b.createdAt?._seconds ?? 0) - (a.createdAt?.seconds ?? a.createdAt?._seconds ?? 0));
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