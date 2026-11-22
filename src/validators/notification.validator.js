const { z } = require("zod");

const NOTIFICATION_TYPES = [
  "annonce",
  "candidature",
  "conversation",
  "message",
  "favoris",
  "commentaire",
  "note",
  "alerte",
];

const TYPES_DESTINATAIRE = [
  "bailleur",
  "locataire",
];

const TYPES_CIBLE = [
  "bien",
  "annonce",
  "candidature",
  "message",
  "conversation",
  "commentaire",
  "favoris",
  "alerte",
  "annonce",
];

/**
 * Validation des données nécessaires à la création
 * d'une notification.
 */
const createNotificationSchema = z.object({
  destinataireId: z
    .string()
    .trim()
    .min(1, "errors:backend.invalidInput"),

  typeDestinataire: z.enum(TYPES_DESTINATAIRE, {
    errorMap: () => ({
      message: "errors:backend.invalidInput",
    }),
  }),

  type: z.enum(NOTIFICATION_TYPES, {
    errorMap: () => ({
      message: "errors:backend.invalidInput",
    }),
  }),

  cibleId: z
    .string()
    .trim()
    .min(1, "errors:backend.invalidInput")
    .optional(),

  typeCible: z
    .enum(TYPES_CIBLE, {
      errorMap: () => ({
        message: "errors:backend.invalidInput",
      }),
    })
    .optional(),

  titre: z
    .string()
    .trim()
    .max(200, "errors:backend.invalidInput")
    .optional()
    .default(""),

  message: z
    .string()
    .trim()
    .max(2000, "errors:backend.invalidInput")
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
    .min(1, "errors:backend.invalidInput"),
});

/**
 * Validation des paramètres de récupération des notifications.
 *
 * La liste est limitée aux 20 notifications les plus récentes.
 */
const getNotificationsSchema = z.object({}).strict();

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
        errors: require('../utils/validationErrors').localizedFlatten(result.error, req),
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
