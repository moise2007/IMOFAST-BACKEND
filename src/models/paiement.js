const { admin } = require("../config/firebase");

const Timestamp = admin.firestore.Timestamp;

/**
 * Catalogue des abonnements disponibles.
 *
 * Le montant envoyé par le client n'est jamais utilisé
 * lorsqu'un plan connu est sélectionné.
 */
const PLANS_ABONNEMENT = {
    mensuel: {
        montant: 5000,
        devise: "XAF",
        dureeJours: 30,
        libelle: "Abonnement mensuel",
    },

    trimestriel: {
        montant: 13000,
        devise: "XAF",
        dureeJours: 90,
        libelle: "Abonnement trimestriel",
    },

    annuel: {
        montant: 45000,
        devise: "XAF",
        dureeJours: 366,
        libelle: "Abonnement annuel",
    },
};

/**
 * Représente un paiement enregistré dans Firestore.
 */
class Paiement {
    /**
     * @param {Object} data
     * @param {string} data.reference
     * @param {string} data.userId
     * @param {"bailleur"|"locataire"} data.role
     * @param {string} [data.type]
     * @param {string} [data.plan]
     * @param {number} data.montant
     * @param {string} data.devise
     * @param {number|null} [data.dureeJours]
     * @param {string} data.statut
     * @param {string} data.libelle
     */
    constructor({
        reference,
        userId,
        role,
        type = "abonnement",
        plan = null,
        montant,
        devise = "XAF",
        dureeJours = null,
        statut = "en_attente",
        libelle,
    }) {
        this.reference = reference;
        this.userId = userId;
        this.role = role;
        this.type = type;
        this.plan = plan;
        this.montant = montant;
        this.devise = devise;
        this.dureeJours = dureeJours;
        this.statut = statut;
        this.libelle = libelle;
    }

    /**
     * Convertit le paiement en document Firestore.
     *
     * @returns {Object}
     */
    toFirebase() {
        return {
            reference: this.reference,
            userId: this.userId,
            role: this.role,
            type: this.type,
            plan: this.plan,
            montant: this.montant,
            devise: this.devise,
            dureeJours: this.dureeJours,
            libelle: this.libelle,
            statut: this.statut,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
    }
}

module.exports = {
    Paiement,
    PLANS_ABONNEMENT,
};