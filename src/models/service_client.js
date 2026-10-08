const { admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Modèle d'un message envoyé au service client.
 */
class MessageClient {
    constructor({
        idPublic,
        userId,
        role,
        object,
        message,
    }) {
        this.idPublic = idPublic;
        this.userId = userId;
        this.role = role;
        this.object = object;
        this.message = message;
    }

    toFirebase() {
        const now = Timestamp.now();

        return {
            idPublic: this.idPublic,
            userId: this.userId,
            role: this.role,
            object: this.object,
            message: this.message,
            statut: "en_attente",
            vu: false,
            createdAt: now,
            updatedAt: now,
        };
    }
}

/**
 * Modèle d'une réclamation.
 */
class Reclamation {
    constructor({
        idPublic,
        userId,
        role,
        type,
        object,
        message,
        paymentId,
    }) {
        this.idPublic = idPublic;
        this.userId = userId;
        this.role = role;
        this.type = type;
        this.object = object;
        this.message = message;
        this.paymentId = paymentId ?? null;
    }

    toFirebase() {
        const now = Timestamp.now();

        return {
            idPublic: this.idPublic,
            userId: this.userId,
            role: this.role,
            type: "reclamation",
            nature: this.type,
            object: this.object,
            message: this.message,
            paymentId: this.paymentId,
            statut: "en_attente",
            vu: false,
            createdAt: now,
            updatedAt: now,
        };
    }
}

/**
 * Modèle d'un signalement.
 */
class SignalementClient {
    constructor({
        idPublic,
        userId,
        role,
        type,
        idElement,
        message,
        image,
    }) {
        this.idPublic = idPublic;
        this.userId = userId;
        this.role = role;
        this.type = type;
        this.idElement = idElement;
        this.message = message;
        this.image = image ?? null;
    }

    toFirebase() {
        const now = Timestamp.now();

        return {
            idPublic: this.idPublic,
            userId: this.userId,
            role: this.role,
            type: "signalement",
            nature: this.type,
            idElement: this.idElement,
            message: this.message,
            image: this.image,
            statut: "en_attente",
            vu: false,
            createdAt: now,
            updatedAt: now,
        };
    }
}

module.exports = {
    MessageClient,
    Reclamation,
    SignalementClient,
};