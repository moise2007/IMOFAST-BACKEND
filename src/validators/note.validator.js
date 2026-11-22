const { z } = require("zod");

const TYPES_CIBLE = ["annonce", "locataire", "bailleur"];

const valeurSchema = z
  .coerce
  .number()
  .int("La note doit être un entier")
  .min(1, "La note minimale est 1")
  .max(5, "La note maximale est 5");

const valeurOuSuppressionSchema = z
  .coerce
  .number()
  .int("La note doit être un entier")
  .min(0, "La note minimale est 0")
  .max(5, "La note maximale est 5");

const typeCibleSchema = z.enum(TYPES_CIBLE, {
  errorMap: () => ({ message: "Le type de cible est invalide" }),
});

/**
 * POST /notes  → voter (créer ou modifier, ou supprimer si valeur = 0)
 */
const voterSchema = z.object({
  cibleId: z.string().trim().min(1, "La cible est requise"),
  typeCible: typeCibleSchema,
  valeur: valeurOuSuppressionSchema,
});

/**
 * Variante stricte si tu veux interdire la suppression via POST.
 */
const createNoteSchema = z.object({
  cibleId: z.string().trim().min(1, "La cible est requise"),
  typeCible: typeCibleSchema,
  valeur: valeurSchema,
});

/**
 * PATCH /notes/:id
 */
const updateNoteSchema = z.object({
  valeur: valeurSchema,
});

/**
 * GET /notes/:id
 */
const noteIdSchema = z.object({
  id: z.string().trim().min(1, "L'identifiant de la note est requis"),
});

/**
 * GET /notes/ma-note?cibleId=...&typeCible=...
 */
const maNoteQuerySchema = z.object({
  cibleId: z.string().trim().min(1, "cibleId est requis"),
  typeCible: typeCibleSchema,
});

/**
 * GET /notes/agregat?cibleId=...&typeCible=...
 */
const agregatQuerySchema = z.object({
  cibleId: z.string().trim().min(1, "cibleId est requis"),
  typeCible: typeCibleSchema,
});

/**
 * GET /notes
 */
const getNotesSchema = z.object({
  cibleId: z.string().trim().min(1).optional(),
  typeCible: typeCibleSchema.optional(),
  auteurId: z.string().trim().min(1).optional(),
  valeur: valeurSchema.optional(),
  min: z.coerce.number().min(1).max(5).optional(),
  max: z.coerce.number().min(1).max(5).optional(),
  pageSize: z.coerce.number().int().positive().max(100).default(30),
  lastId: z.string().trim().min(1).optional(),
}).refine(
  (data) => {
    if (data.min !== undefined && data.max !== undefined) {
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
  voterSchema,
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  maNoteQuerySchema,
  agregatQuerySchema,
  getNotesSchema,
  validate,
};