const crypto = require("crypto");

const {
    Paiement,
    PLANS_ABONNEMENT,
} = require("../../models/paiement");

const paiementRepository =
    require("../../repositories/paiement.repository");

const { admin } =
    require("../../config/firebase");

const Timestamp =
    admin.firestore.Timestamp;

/**
 * Génère une référence unique.
 *
 * @returns {string}
 */
const genererReference = () => {
    return `abo_${Date.now()}_${crypto
        .randomBytes(4)
        .toString("hex")}`;
};

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

    throw error;
};

/**
 * Construit l'offre de paiement.
 *
 * @param {Object} data
 * @returns {Object}
 */
const construireOffre = ({
    plan,
    montant,
    libelle,
}) => {
    if (plan) {
        const offre =
            PLANS_ABONNEMENT[plan];

        if (!offre) {
            createBusinessError(
                "Plan d'abonnement invalide."
            );
        }

        return {
            ...offre,
            plan,
        };
    }

    if (!montant) {
        createBusinessError(
            "Un plan ou un montant est obligatoire."
        );
    }

    return {
        plan: null,
        montant,
        devise: "XAF",
        dureeJours: null,
        libelle:
            libelle ??
            "Transaction sur ImoFast",
    };
};

/**
 * Initialise un paiement.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @param {Object} params.user
 * @param {"bailleur"|"locataire"} params.role
 *
 * @returns {Promise<Object>}
 */
const createDepot = async ({
    data,
    user,
    role,
}) => {
    const offre = construireOffre(data);

    const reference =
        genererReference();

    const paiement =
        new Paiement({
            reference,
            userId: user.id,
            role,
            type:
                data.type ??
                "abonnement",
            plan: offre.plan,
            montant: offre.montant,
            devise: offre.devise,
            dureeJours:
                offre.dureeJours,
            libelle: offre.libelle,
        });

    await paiementRepository.create(
        reference,
        paiement.toFirebase()
    );

    let response;

    try {
        response = await fetch(
            "https://api.notchpay.co/payments/initialize",
            {
                method: "POST",

                headers: {
                    Authorization:
                        process.env.PUBLIC_KEY_NOTCHPAY,
                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify({
                    amount: offre.montant,
                    currency: offre.devise,
                    reference,

                    email: user.email,

                    description:
                        offre.libelle,

                    callback:
                        process.env.FRONT_URL_NOTCHPAY,

                    metadata: {
                        userId: user.id,
                        role,
                        plan: offre.plan,
                    },
                }),
            }
        );
    } catch (error) {
        await paiementRepository.update(
            reference,
            {
                statut: "echec",
                erreur: error.message,
            }
        );

        createBusinessError(
            "Impossible de contacter le service de paiement.",
            502
        );
    }

    const dataNotchPay =
        await response.json();

    if (
        !response.ok ||
        !dataNotchPay?.authorization_url
    ) {
        await paiementRepository.update(
            reference,
            {
                statut: "echec",
                erreur:
                    dataNotchPay?.message ??
                    "Réponse NotchPay invalide",
            }
        );

        createBusinessError(
            dataNotchPay?.message ??
                "Impossible d'initier le paiement.",
            502
        );
    }

    return {
        reference,
        authorization_url:
            dataNotchPay.authorization_url,
    };
};

/**
 * Calcule le nouveau forfait.
 *
 * @param {Object} params
 * @param {Object} params.forfait
 * @param {number} params.dureeJours
 * @param {string} params.plan
 *
 * @returns {Object}
 */
const calculerForfait = ({
    forfait,
    dureeJours,
    plan,
}) => {
    const maintenant =
        Date.now();

    let tempsRestant = 0;

    if (forfait?.fin) {
        const ancienneFin =
            forfait.fin.toMillis
                ? forfait.fin.toMillis()
                : forfait.fin._seconds
                    ? forfait.fin._seconds * 1000
                    : new Date(
                        forfait.fin
                    ).getTime();

        tempsRestant =
            Math.max(
                ancienneFin -
                    maintenant,
                0
            );
    }

    const duree =
        dureeJours *
        24 *
        60 *
        60 *
        1000;

    return {
        type: plan,

        debut:
            Timestamp.now(),

        fin:
            Timestamp.fromMillis(
                maintenant +
                duree +
                tempsRestant
            ),
    };
};

/**
 * Vérifie le statut d'un paiement.
 *
 * @param {Object} params
 * @param {string} params.reference
 * @param {Object} params.user
 * @param {"bailleur"|"locataire"} params.role
 *
 * @returns {Promise<Object>}
 */
const searchStatusPaiement = async ({
    reference,
    user,
    role,
}) => {
    let response;

    try {
        response = await fetch(
            `https://api.notchpay.co/payments/${reference}`,
            {
                headers: {
                    Authorization:
                        process.env.PUBLIC_KEY_NOTCHPAY,
                },
            }
        );
    } catch (error) {
        createBusinessError(
            "Impossible de contacter le service de paiement.",
            502
        );
    }

    const data =
        await response.json();

    const transaction =
        data?.transaction;

    if (!transaction) {
        createBusinessError(
            "Transaction NotchPay introuvable.",
            502
        );
    }

    const merchantReference =
        transaction.merchant_reference;

    const paiement =
        await paiementRepository
            .findByReference(
                merchantReference
            );

    if (!paiement) {
        createBusinessError(
            "Paiement introuvable.",
            404
        );
    }

    /**
     * Vérification anti-fraude.
     */
    if (
        paiement.userId !== user.id ||
        paiement.role !== role
    ) {
        createBusinessError(
            "Ce paiement ne vous appartient pas.",
            403
        );
    }

    const status =
        transaction.status;

    /**
     * Si le paiement n'est pas terminé,
     * on met simplement à jour son statut.
     */
    if (status !== "complete") {
        await paiementRepository.update(
            merchantReference,
            {
                statut: status,
            }
        );

        return {
            status,
            montant:
                transaction.amount,
            reference:
                merchantReference,
            authorization_url:
                data?.authorization_url,
            message:
                data?.message ?? "",
        };
    }

    /**
     * Idempotence.
     *
     * Si le paiement a déjà été traité,
     * on ne prolonge pas une deuxième fois
     * le forfait.
     */
    if (paiement.statut === "complete") {
        return {
            status,
            montant:
                transaction.amount,
            reference:
                merchantReference,
            message:
                "Paiement déjà traité.",
        };
    }

    /**
     * Paiement réussi.
     */
    await paiementRepository.update(
        merchantReference,
        {
            statut: "complete",
            completedAt:
                Timestamp.now(),
        }
    );

    /**
     * Paiement personnalisé :
     * aucun forfait à activer.
     */
    if (
        !paiement.plan ||
        !paiement.dureeJours
    ) {
        return {
            status: "complete",
            montant:
                transaction.amount,
            reference:
                merchantReference,
            message:
                "Paiement confirmé.",
        };
    }

    const utilisateur =
        await paiementRepository
            .findUtilisateur(
                paiement.role,
                paiement.userId
            );

    if (!utilisateur) {
        createBusinessError(
            "Utilisateur associé au paiement introuvable.",
            404
        );
    }

    const forfait =
        calculerForfait({
            forfait:
                utilisateur.forfait,
            dureeJours:
                paiement.dureeJours,
            plan:
                paiement.plan,
        });

    await paiementRepository
        .updateForfait(
            paiement.role,
            paiement.userId,
            forfait
        );

    return {
        status: "complete",
        montant:
            transaction.amount,
        reference:
            merchantReference,
        forfait: {
            type: forfait.type,
            debut: forfait.debut,
            fin: forfait.fin,
        },
        message:
            data?.message ??
            "Abonnement activé avec succès.",
    };
};

module.exports = {
    createDepot,
    searchStatusPaiement,
};