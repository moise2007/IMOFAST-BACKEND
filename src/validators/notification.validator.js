const { z } = require("zod");

const NOTIFICATION_TYPES = [
  "candidature",
  "conversation",
  "message",
  "favoris",
  "commentaire",
  "note",
];

const TYPES_DESTINATAIRE = [
  "bailleur",
  "locataire",
];

const TYPES_CIBLE = [
  "bien",
  "candidature",
  "message",
  "conversation",
  "commentaire",
  "favoris",
];

/**
 * Validation des données nécessaires à la création
 * d'une notification.
 */
const createNotificationSchema = z.object({
  destinataireId: z
    .string()
    .trim()
    .min(1, "Le destinataire est requis"),

  typeDestinataire: z.enum(TYPES_DESTINATAIRE, {
    errorMap: () => ({
      message: "Le type de destinataire est invalide",
    }),
  }),

  type: z.enum(NOTIFICATION_TYPES, {
    errorMap: () => ({
      message: "Le type de notification est invalide",
    }),
  }),

  cibleId: z
    .string()
    .trim()
    .min(1, "La cible de la notification est requise")
    .optional(),

  typeCible: z
    .enum(TYPES_CIBLE, {
      errorMap: () => ({
        message: "Le type de cible est invalide",
      }),
    })
    .optional(),

  titre: z
    .string()
    .trim()
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .optional()
    .default(""),

  message: z
    .string()
    .trim()
    .max(2000, "Le message ne peut pas dépasser 2000 caractères")
    .optional()
    .default(""),
});

/**
 * Validation de l'identifiant public d'une notification.
 */
const notificationIdSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "L'identifiant de la notification est requis"),
});

/**
 * Validation des paramètres de récupération des notifications.
 *
 * Exemple :
 * GET /notifications?pageSize=20&lastId=abc123
 */
const getNotificationsSchema = z.object({
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

  lu: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
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
    }

    next();
  };
};

module.exports = {
  NOTIFICATION_TYPES,
  TYPES_DESTINATAIRE,
  TYPES_CIBLE,
  createNotificationSchema,
  notificationIdSchema,
  getNotificationsSchema,
  validate,
};