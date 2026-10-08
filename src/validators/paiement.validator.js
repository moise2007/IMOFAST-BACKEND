const { z } = require("zod");

const PLANS = [
    "mensuel",
    "trimestriel",
    "annuel",
];

const createDepotSchema = z.object({
    plan: z
        .enum(PLANS)
        .optional(),

    /**
     * Montant uniquement utilisé lorsqu'aucun plan
     * prédéfini n'est sélectionné.
     */
    montant: z
        .coerce
        .number()
        .int()
        .positive()
        .optional(),

    libelle: z
        .string()
        .trim()
        .min(2)
        .max(512)
        .optional(),

    type: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .default("abonnement"),
})
    .refine(
        (data) => Boolean(data.plan) || Boolean(data.montant),
        {
            message: "Un plan ou un montant est obligatoire.",
            path: ["plan"],
        }
    );

const searchStatusPaiementSchema = z.object({
    reference: z
        .string()
        .trim()
        .min(1)
        .max(255),
});

/**
 * Middleware générique de validation Zod.
 *
 * @param {import("zod").ZodSchema} schema
 * @param {"body"|"params"|"query"} source
 * @returns {Function}
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
    createDepotSchema,
    searchStatusPaiementSchema,
    validate,
};