const { z } = require("zod");

const getProfilSchema = z.object({
    idPublic: z
        .string()
        .trim()
        .min(1, "L'identifiant public est obligatoire"),

    role: z.enum(["bailleur", "locataire"]),
});

/**
 * Valide les données d'une requête avec Zod.
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
    getProfilSchema,
    validate,
};