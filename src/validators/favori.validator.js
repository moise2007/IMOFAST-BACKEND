const { z } = require("zod");

/**
 * Valide l'identifiant d'une annonce.
 */
const annonceIdSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "L'identifiant de l'annonce est requis"),
});

/**
 * Valide l'identifiant d'un favori.
 */
const favoriIdSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "L'identifiant du favori est requis"),
});

/**
 * Valide les paramètres de récupération des favoris.
 */
const getFavorisSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(30),
});

/**
 * Middleware générique de validation Zod.
 *
 * @param {import("zod").ZodSchema} schema
 * @param {"body"|"params"|"query"} source
 * @returns {import("express").RequestHandler}
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

    switch (source) {
      case "params":
        req.validatedParams = result.data;
        break;

      case "query":
        req.validatedQuery = result.data;
        break;

      default:
        req.validatedBody = result.data;
        break;
    }

    next();
  };
};

module.exports = {
  annonceIdSchema,
  favoriIdSchema,
  getFavorisSchema,
  validate,
};