const { z } = require("zod");

/**
 * Types de messages autorisés.
 */
const MESSAGE_TYPES = [
  "texte",
  "image",
  "video",
  "audio",
  "lien_annonce",
  "lien_profil",
];

/**
 * Valide l'identifiant public d'un message.
 */
const messageIdSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "L'identifiant du message est requis"),
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
 * Valide les données nécessaires à l'envoi d'un message.
 */
const createMessageSchema = z.object({
  conversationId: z
    .string()
    .trim()
    .min(1, "L'identifiant de la conversation est requis"),

  type: z.enum(MESSAGE_TYPES),

  contenu: z
    .string()
    .trim()
    .optional(),

  medias: z
    .object({
      url: z.string().url().optional(),
      miniature: z.string().url().optional(),
      taille: z.number().nonnegative().optional(),
      duree: z.number().nonnegative().optional(),
    })
    .optional(),

  lien: z
    .object({
      idPublic: z.string().trim().min(1).optional(),
      titre: z.string().optional(),
      photoProfil: z.string().optional(),
      nature: z.string().optional(),
      localisation: z.any().optional(),
      prix: z.number().optional(),
    })
    .optional(),

  repondsA: z
    .string()
    .trim()
    .optional(),
});

/**
 * Valide les données de modification d'un message.
 *
 * Le type peut être modifié, mais le contenu est le principal
 * élément modifiable dans le comportement actuel.
 */
const updateMessageSchema = z.object({
  type: z.enum(MESSAGE_TYPES).optional(),

  contenu: z
    .string()
    .trim()
    .optional(),
});

/**
 * Valide la pagination des messages.
 */
const getMessagesSchema = z.object({
  lastId: z
    .string()
    .trim()
    .optional(),
});

/**
 * Middleware générique de validation.
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
  MESSAGE_TYPES,
  messageIdSchema,
  conversationIdSchema,
  createMessageSchema,
  updateMessageSchema,
  getMessagesSchema,
  validate,
};