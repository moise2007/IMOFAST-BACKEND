const { z } = require("zod");

/**
 * Types de ressources pouvant recevoir un commentaire.
 */
const TYPES_CIBLE = [
  "profil",
  "locataire",
  "annonce",
  "bien",
  "bailleur",
];

/**
 * Validation commune du contenu d'un commentaire.
 *
 * Le trim permet d'éviter qu'un message composé uniquement
 * d'espaces soit considéré comme valide.
 */
const messageSchema = z
  .string()
  .trim()
  .min(1, "Le contenu du commentaire est requis");

/**
 * Validation de la création d'un commentaire.
 *
 * @example
 * {
 *   "cibleId": "annonce_123",
 *   "typeCible": "annonce",
 *   "message": "Très belle annonce."
 * }
 */
const createCommentaireSchema = z.object({
  cibleId: z
    .string()
    .trim()
    .min(1, "L'identifiant de la cible est requis"),

  typeCible: z.enum(TYPES_CIBLE),

  message: messageSchema,
});

/**
 * Validation de l'identifiant d'un commentaire.
 *
 * Utilisé par les routes :
 * - PATCH /:id
 * - DELETE /:id
 * - POST /:id/reponses
 */
const commentaireIdSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "L'identifiant du commentaire est requis"),
});

/**
 * Validation des paramètres permettant de récupérer
 * les commentaires d'une cible.
 *
 * @example
 * GET /commentaires/annonce/annonce_123
 */
const getCommentairesParamsSchema = z.object({
  typeCible: z.enum(TYPES_CIBLE),

  cibleId: z
    .string()
    .trim()
    .min(1, "L'identifiant de la cible est requis"),
});

/**
 * Validation des paramètres de pagination.
 *
 * `pageSize` est converti automatiquement en nombre car
 * les paramètres provenant de req.query sont des chaînes.
 *
 * @example
 * GET /commentaires/annonce/annonce_123?pageSize=10&lastId=cmt_123
 */
const getCommentairesSchema = z.object({
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10),

  lastId: z
    .string()
    .trim()
    .optional(),
});

/**
 * Validation de la modification d'un commentaire.
 */
const updateCommentaireSchema = z.object({
  message: messageSchema,
});

/**
 * Validation de la réponse à un commentaire.
 */
const responseCommentaireSchema = z.object({
  message: messageSchema,
});

/**
 * Middleware générique de validation Zod.
 *
 * @param {import("zod").ZodSchema} schema
 * @param {"body"|"params"|"query"} [source="body"]
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
  TYPES_CIBLE,
  createCommentaireSchema,
  commentaireIdSchema,
  getCommentairesParamsSchema,
  getCommentairesSchema,
  updateCommentaireSchema,
  responseCommentaireSchema,
  validate,
};