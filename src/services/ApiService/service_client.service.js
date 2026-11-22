const { createId } = require("@paralleldrive/cuid2");

const {
    MessageClient,
    Reclamation,
    SignalementClient,
} = require("../../models/service_client");

const serviceClientRepository = require("../../repositories/service_client.reporitory");

/**
 * Crée une erreur métier.
 *
 * @param {string} message
 * @param {number} statusCode
 * @throws {Error}
 */
const createBusinessError = (
    message,
    statusCode = 400
) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;

    throw error;
};

/**
 * Envoie un message au service client.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @param {Object|null} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const createMessage = async ({
    data,
    user,
    role,
}) => {
    const message = new MessageClient({
        idPublic: createId(),
        userId: user?.idPublic ?? null,
        role: role ?? "visiteur",
        object: data.object,
        message: data.message,
    });

    const result = await serviceClientRepository.create(
        "message_user",
        { ...message.toFirebase(), contact: { email: data.email || user?.email || null, telephone: data.telephone || user?.telephone || null }, langue: user?.langue || data.langue || "fr" }
    );

    return result.data;
};

/**
 * Crée une réclamation.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @param {Object|null} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const createReclamation = async ({
    data,
    user,
    role,
}) => {
    const reclamation = new Reclamation({
        idPublic: createId(),
        userId: user?.idPublic ?? null,
        role: role ?? "visiteur",
        type: data.type,
        object: data.object,
        message: data.message,
        paymentId: data.paymentId,
    });

    const result = await serviceClientRepository.create(
        "reclamation",
        { ...reclamation.toFirebase(), contact: { email: data.email || user?.email || null, telephone: data.telephone || user?.telephone || null }, langue: user?.langue || data.langue || "fr" }
    );

    return result.data;
};

/**
 * Crée un signalement.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @param {Object|null} params.user
 * @param {string} params.role
 * @returns {Promise<Object>}
 */
const createSignalement = async ({
    data,
    user,
    role,
}) => {
    const signalement = new SignalementClient({
        idPublic: createId(),
        userId: user?.idPublic ?? null,
        role: role ?? "visiteur",
        type: data.type,
        idElement: data.idElement,
        message: data.message,
        image: data.image,
    });

    const result = await serviceClientRepository.create(
        "signalement",
        { ...signalement.toFirebase(), contact: { email: data.email || user?.email || null, telephone: data.telephone || user?.telephone || null }, langue: user?.langue || data.langue || "fr" }
    );

    return result.data;
};

/**
 * Récupère les demandes d'un utilisateur.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {Object} params.filters
 * @returns {Promise<Object>}
 */
const getDemandes = async ({
    userId,
    filters = {},
}) => {
    let demandes =
        await serviceClientRepository.findAllByUser(userId);

    if (filters.type) {
        demandes = demandes.filter(
            (demande) =>
                demande.type === filters.type
        );
    }

    demandes.sort((a, b) => {
        const dateA =
            a.createdAt?.toMillis?.() ?? 0;

        const dateB =
            b.createdAt?.toMillis?.() ?? 0;

        return dateB - dateA;
    });

    const pageSize = filters.pageSize ?? 30;

    let startIndex = 0;

    if (filters.lastId) {
        const index = demandes.findIndex(
            (demande) =>
                demande.idPublic === filters.lastId ||
                demande.id === filters.lastId
        );

        if (index === -1) createBusinessError("errors:backend.invalidCursor", 400);
        if (index !== -1) {
            startIndex = index + 1;
        }
    }

    const result = demandes.slice(
        startIndex,
        startIndex + pageSize
    );

    const lastDemande =
        result[result.length - 1];

    return {
        demandes: result,
        total: demandes.length,
        lastId:
            lastDemande?.idPublic ??
            lastDemande?.id ??
            null,
        hasMore:
            startIndex + pageSize < demandes.length,
    };
};

/**
 * Récupère une demande par son identifiant.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {string} params.type
 * @param {string} params.userId
 * @returns {Promise<Object>}
 */
const getDemande = async ({
    id,
    type,
    userId,
}) => {
    const collections = {
        message: "message_user",
        reclamation: "reclamation",
        signalement: "signalement",
    };

    const collection = collections[type];

    if (!collection) {
        createBusinessError(
            "errors:backend.invalidInput",
            400
        );
    }

    const result =
        await serviceClientRepository.findByPublicId(
            collection,
            id
        );

    if (!result) {
        createBusinessError(
            "errors:backend.notFound",
            404
        );
    }

    if (result.data.userId !== userId) {
        createBusinessError(
            "errors:backend.forbidden",
            403
        );
    }

    return {
        id: result.documentId,
        type,
        ...result.data,
    };
};

async function getContacts() {
    const saved = await serviceClientRepository.getContacts();
    return {
        email: saved.email || process.env.SUPPORT_EMAIL || 'contact@imofast.org',
        telephone: saved.telephone || process.env.SUPPORT_PHONE || null,
        whatsapp: saved.whatsapp || process.env.SUPPORT_WHATSAPP || null,
    };
}
module.exports = {
    getContacts,
    createMessage,
    createReclamation,
    createSignalement,
    getDemandes,
    getDemande,
};