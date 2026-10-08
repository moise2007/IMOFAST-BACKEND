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
    object: z
        .string()
        .trim()
        .min(2, "L'objet doit contenir au moins 2 caractères.")
        .max(512, "L'objet ne peut pas dépasser 512 caractères."),

    message: z
        .string()
        .trim()
        .min(5, "Le message doit contenir au moins 5 caractères.")
        .max(5000, "Le message ne peut pas dépasser 5000 caractères."),
});

/**
 * Validation d'une réclamation.
 */
const createReclamationSchema = z.object({
    type: z.enum(TYPES_RECLAMATION),

    object: z
        .string()
        .trim()
        .min(2, "L'objet est requis.")
        .max(512),

    message: z
        .string()
        .trim()
        .min(5, "Le message doit contenir au moins 5 caractères.")
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
    type: z.enum(TYPES_SIGNALEMENT),

    idElement: z
        .string()
        .trim()
        .min(1, "L'élément signalé est requis."),

    message: z
        .string()
        .trim()
        .min(5, "La description doit contenir au moins 5 caractères.")
        .max(5000),

    image: z
        .string()
        .url("L'image doit être une URL valide.")
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
                errors: result.error.flatten(),
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