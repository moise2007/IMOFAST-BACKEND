const { z } = require("zod");

/**
 * Valide les paramètres nécessaires à la création
 * ou à la réactivation d'une conversation.
 */
const createConversationParamsSchema = z.object({
  auteur1Id: z
    .string()
    .trim()
    .min(1, "L'identifiant du destinataire est requis"),
});

/**
 * Valide l'identifiant public d'une conversation.
 */
const conversationIdSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "L'identifiant de la conversation est requis"),
});

/**
 * Valide les paramètres de recherche des contacts.
 */
const contactSearchSchema = z.object({
  texte: z.string().trim().default(""),

  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
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
  createConversationParamsSchema,
  conversationIdSchema,
  contactSearchSchema,
  validate,
};