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
  cursor: z.string().max(1000).refine(value => {
    try {
      const data = JSON.parse(Buffer.from(value, "base64url").toString());
      return Array.isArray(data) && data.length === 3 && Number.isInteger(data[0]) && data[0] >= 0 && Number.isInteger(data[1]) && data[1] >= 0 && data[1] < 1e9 && typeof data[2] === "string" && data[2].length > 0 && !data[2].includes("/");
    } catch { return false; }
  }, "Invalid cursor").optional(),
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