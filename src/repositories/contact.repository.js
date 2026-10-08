const { db, admin } = require("../config/firebase");

const COLLECTION = "contact";

/**
 * Repository responsable de l'accès aux contacts dans Firestore.
 */
const contactRepository = {
  /**
   * Crée un nouveau contact.
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const documentReference = db.collection(COLLECTION).doc();

    await documentReference.set(data);

    return {
      documentId: documentReference.id,
      contact: data,
    };
  },

  /**
   * Recherche un contact par son identifiant public.
   *
   * @param {string} idPublic
   * @returns {Promise<Object|null>}
   */
  async findByPublicId(idPublic) {
    const snapshot = await db
      .collection(COLLECTION)
      .where("idPublic", "==", idPublic)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const document = snapshot.docs[0];

    return {
      documentId: document.id,
      contact: {
        id: document.id,
        ...document.data(),
      },
    };
  },

  /**
   * Récupère la liste des contacts.
   *
   * @param {Object} filters
   * @param {number} filters.page
   * @param {number} filters.limit
   * @param {string} [filters.statut]
   * @param {string} [filters.recherche]
   * @returns {Promise<Object>}
   */
  async list({
    page = 1,
    limit = 20,
    statut,
    recherche,
  }) {
    let query = db.collection(COLLECTION);

    if (statut) {
      query = query.where("statut", "==", statut);
    }

    query = query.orderBy("createdAt", "desc");

    const snapshot = await query.get();

    let contacts = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    /**
     * Recherche applicative.
     *
     * On évite ici de multiplier les index Firestore.
     */
    if (recherche) {
      const search = recherche.toLowerCase();

      contacts = contacts.filter((contact) => {
        return (
          contact.nom?.toLowerCase().includes(search) ||
          contact.email?.toLowerCase().includes(search) ||
          contact.sujet?.toLowerCase().includes(search) ||
          contact.message?.toLowerCase().includes(search)
        );
      });
    }

    const total = contacts.length;
    const totalPages = Math.ceil(total / limit);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedContacts = contacts.slice(startIndex, endIndex);

    return {
      contacts: paginatedContacts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },

  /**
   * Met à jour le statut d'un contact.
   *
   * @param {Object} params
   * @param {string} params.documentId
   * @param {string} params.statut
   * @returns {Promise<Object>}
   */
  async updateStatus({ documentId, statut }) {
    const data = {
      statut,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db
      .collection(COLLECTION)
      .doc(documentId)
      .update(data);

    return data;
  },
};

module.exports = contactRepository;