const { z } = require("zod");

const TYPES_RECLAMATION = [
    "paiement",
    "location",
    "application",
    "autre",
];

const TYPES_SIGNALEMENT = [
    "bien",
    "profil",
    "annonce",
    "utilisateur",
    "autre",
];

/**
 * Validation d'un message au service client.
 */
const createMessageSchema = z.object({
    email: z.string().email().max(254).optional(),
    telephone: z.string().trim().min(6).max(30).optional(),
    langue: z.enum(['fr', 'en']).optional(),
    object: z
        .string()
        .trim()
        .min(2, "errors:backend.invalidInput")
        .max(512, "errors:backend.invalidInput"),

    message: z
        .string()
        .trim()
        .min(5, "errors:backend.invalidInput")
        .max(5000, "errors:backend.invalidInput"),
});

/**
 * Validation d'une réclamation.
 */
const createReclamationSchema = z.object({
    email: z.string().email().max(254).optional(),
    telephone: z.string().trim().min(6).max(30).optional(),
    langue: z.enum(['fr', 'en']).optional(),
    type: z.enum(TYPES_RECLAMATION),

    object: z
        .string()
        .trim()
        .min(2, "errors:backend.invalidInput")
        .max(512),

    message: z
        .string()
        .trim()
        .min(5, "errors:backend.invalidInput")
        .max(5000),

    paymentId: z
        .string()
        .trim()
        .min(1)
        .optional(),
});

/**
 * Validation d'un signalement.
 */
const createSignalementSchema = z.object({
    email: z.string().email().max(254).optional(),
    telephone: z.string().trim().min(6).max(30).optional(),
    langue: z.enum(['fr', 'en']).optional(),
    type: z.enum(TYPES_SIGNALEMENT),

    idElement: z
        .string()
        .trim()
        .min(1, "errors:backend.invalidInput"),

    message: z
        .string()
        .trim()
        .min(5, "errors:backend.invalidInput")
        .max(5000),

    image: z
        .string()
        .url("errors:backend.invalidInput")
        .optional(),
});

/**
 * Validation de l'identifiant d'une demande.
 */
const demandeIdSchema = z.object({
    id: z.string().trim().min(1),
});

/**
 * Validation des filtres de récupération.
 */
const getDemandesSchema = z.object({
    type: z
        .enum([
            "message",
            "reclamation",
            "signalement",
        ])
        .optional(),

    pageSize: z
        .coerce
        .number()
        .int()
        .positive()
        .max(100)
        .default(30),

    lastId: z
        .string()
        .trim()
        .min(1)
        .optional(),
});

/**
 * Middleware générique de validation.
 */
const validate = (schema, source = "body") => {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                errors: require('../utils/validationErrors').localizedFlatten(result.error, req),
            });
        }

        if (source === "body") {
            req.validatedBody = result.data;
        }

        if (source === "params") {
            req.validatedParams = result.data;
        }

        if (source === "query") {
            req.validatedQuery = result.data;
        }

        next();
    };
};

module.exports = {
    createMessageSchema,
    createReclamationSchema,
    createSignalementSchema,
    demandeIdSchema,
    getDemandesSchema,
    validate,
};