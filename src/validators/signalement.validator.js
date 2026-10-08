const { z } = require("zod");

const TYPES_CIBLE = ["bien", "profil"];

const RAISONS = [
  "contenu_inapproprie",
  "arnaque",
  "fausses_informations",
  "harcelement",
  "doublon",
  "autre",
];

const STATUTS = [
  "en_attente",
  "traite",
  "rejete",
];

/**
 * Validation des données nécessaires à la création d'un signalement.
 */
const createSignalementSchema = z.object({
  idCible: z
    .string()
    .trim()
    .min(1, "La cible du signalement est requise"),

  typeCible: z.enum(TYPES_CIBLE, {
    errorMap: () => ({
      message: "Le type de cible est invalide",
    }),
  }),

  raison: z.enum(RAISONS, {
    errorMap: () => ({
      message: "La raison du signalement est invalide",
    }),
  }),

  description: z
    .string()
    .trim()
    .max(2000, "La description ne peut pas dépasser 2000 caractères")
    .optional()
    .default(""),
});

/**
 * Validation de l'identifiant public d'un signalement.
 */
const signalementIdSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "L'identifiant du signalement est requis"),
});

/**
 * Validation des filtres de recherche.
 */
const getSignalementsSchema = z.object({
  typeCible: z
    .enum(TYPES_CIBLE)
    .optional(),

  idCible: z
    .string()
    .trim()
    .min(1)
    .optional(),

  raison: z
    .enum(RAISONS)
    .optional(),

  statut: z
    .enum(STATUTS)
    .optional(),

  idAuteur: z
    .string()
    .trim()
    .min(1)
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
    .optional(),
});

/**
 * Validation des données modifiables d'un signalement.
 *
 * Le statut n'est pas modifiable ici par l'auteur.
 * Sa modification peut être exposée dans une route d'administration
 * dédiée si nécessaire.
 */
const updateSignalementSchema = z
  .object({
    raison: z
      .enum(RAISONS)
      .optional(),

    description: z
      .string()
      .trim()
      .max(2000)
      .optional(),

    idCible: z
      .string()
      .trim()
      .min(1)
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "Aucune donnée à modifier",
    }
  );

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
  TYPES_CIBLE,
  RAISONS,
  STATUTS,
  createSignalementSchema,
  signalementIdSchema,
  getSignalementsSchema,
  updateSignalementSchema,
  validate,
};