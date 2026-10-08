const { z } = require("zod");

const TYPES_CIBLE = [
  "profil",
  "bailleur",
  "locataire",
  "bien",
  "annonce",
];

/**
 * Validation d'une valeur de note.
 */
const valeurSchema = z
  .coerce
  .number()
  .min(0, "La note minimale est 0")
  .max(5, "La note maximale est 5");

/**
 * Validation lors de la création d'une note.
 */
const createNoteSchema = z.object({
  cibleId: z
    .string()
    .trim()
    .min(1, "La cible est requise"),

  typeCible: z.enum(TYPES_CIBLE, {
    errorMap: () => ({
      message: "Le type de cible est invalide",
    }),
  }),

  valeur: valeurSchema,
});

/**
 * Validation lors de la modification d'une note.
 */
const updateNoteSchema = z.object({
  valeur: valeurSchema,
});

/**
 * Validation de l'identifiant public d'une note.
 */
const noteIdSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "L'identifiant de la note est requis"),
});

/**
 * Validation des filtres de recherche.
 *
 * Exemples :
 * GET /notes?typeCible=bien
 * GET /notes?cibleId=bien123
 * GET /notes?min=3&max=5
 * GET /notes?auteurId=user123
 */
const getNotesSchema = z.object({
  cibleId: z
    .string()
    .trim()
    .min(1)
    .optional(),

  typeCible: z
    .enum(TYPES_CIBLE, {
      errorMap: () => ({
        message: "Le type de cible est invalide",
      }),
    })
    .optional(),

  auteurId: z
    .string()
    .trim()
    .min(1)
    .optional(),

  valeur: valeurSchema.optional(),

  min: z
    .coerce
    .number()
    .min(0)
    .max(5)
    .optional(),

  max: z
    .coerce
    .number()
    .min(0)
    .max(5)
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
    .min(1)
    .optional(),
})
.refine(
  (data) => {
    if (
      data.min !== undefined &&
      data.max !== undefined
    ) {
      return data.min <= data.max;
    }

    return true;
  },
  {
    message: "La valeur minimale doit être inférieure ou égale à la valeur maximale",
    path: ["min"],
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
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  getNotesSchema,
  validate,
};