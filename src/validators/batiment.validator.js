const { z } = require("zod");

/**
 * Transforme les valeurs vides provenant notamment des query params
 * en undefined.
 *
 * @param {*} value
 * @returns {*}
 */
const emptyToUndefined = (value) => {
  if (
    value === "" ||
    value === "null" ||
    value === "undefined"
  ) {
    return undefined;
  }

  return value;
};

/**
 * Schéma de localisation d'un bâtiment.
 */
const localisationSchema = z.object({
  ville: z
    .string({ message: "La ville est obligatoire" })
    .trim()
    .min(2, "La ville doit contenir au moins 2 caractères"),

  quartier: z
    .string({ message: "Le quartier est obligatoire" })
    .trim()
    .min(2, "Le quartier doit contenir au moins 2 caractères"),

  pays: z
    .string()
    .trim()
    .default("cameroun"),

  lat: z.coerce
    .number()
    .optional(),

  lon: z.coerce
    .number()
    .optional(),

  adresse: z
    .string()
    .trim()
    .optional(),
});

/**
 * Schéma de création d'un bâtiment.
 */
const createBatimentSchema = z.object({
  nom: z
    .string({ message: "Le nom est obligatoire" })
    .trim()
    .min(3, "Le nom doit contenir au moins 3 caractères"),

  ville: z
    .string({ message: "La ville est obligatoire" })
    .trim()
    .min(2, "La ville doit contenir au moins 2 caractères"),

  quartier: z
    .string({ message: "Le quartier est obligatoire" })
    .trim()
    .min(2, "Le quartier doit contenir au moins 2 caractères"),

  pays: z
    .string()
    .trim()
    .default("cameroun"),

  equipement: z
    .array(z.string().trim())
    .optional(),

  gardien: z
    .boolean()
    .optional(),

  portail: z
    .boolean()
    .optional(),

  jardin: z
    .boolean()
    .optional(),

  piscine: z
    .boolean()
    .optional(),

  environement: z
    .string()
    .trim()
    .optional(),

  barriere: z
    .boolean()
    .optional(),

  dateConstruction: z
    .string()
    .optional(),

  prixGoudron: z.coerce
    .number({
      message: "Le prix pour le goudron est obligatoire",
    })
    .int("Le prix pour le goudron doit être un entier")
    .nonnegative("Le prix pour le goudron ne peut pas être négatif"),

  lon: z.coerce
    .number()
    .optional(),

  lat: z.coerce
    .number()
    .optional(),

  adresse: z
    .string()
    .trim()
    .optional(),
});

/**
 * Schéma de récupération de la liste des bâtiments.
 */
const getBatimentsSchema = z.object({
  ville: z
    .preprocess(emptyToUndefined, z.string().trim().optional()),

  quartier: z
    .preprocess(emptyToUndefined, z.string().trim().optional()),

  nom: z
    .preprocess(emptyToUndefined, z.string().trim().optional()),

  lastId: z
    .preprocess(emptyToUndefined, z.string().trim().optional()),
});

/**
 * Schéma utilisé pour récupérer un bâtiment par son identifiant.
 */
const getBatimentSchema = z.object({
  id: z
    .string({ message: "L'identifiant du bâtiment est obligatoire" })
    .trim()
    .min(1, "L'identifiant du bâtiment est invalide")
    .max(50, "L'identifiant du bâtiment est invalide"),
});

/**
 * Schéma utilisé pour supprimer un bâtiment.
 */
const deleteBatimentSchema = getBatimentSchema;

/**
 * Champs modifiables d'un bâtiment.
 */
const champsModifiables = {
  nom: true,
  ville: true,
  quartier: true,
  pays: true,
  equipement: true,
  gardien: true,
  portail: true,
  jardin: true,
  piscine: true,
  environement: true,
  barriere: true,
  dateConstruction: true,
  prixGoudron: true,
  lon: true,
  lat: true,
  adresse: true,
};

/**
 * Schéma de modification d'un bâtiment.
 *
 * Au moins un champ doit être fourni.
 */
const updateBatimentSchema = createBatimentSchema
  .pick(champsModifiables)
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "Aucun champ à modifier",
    }
  );

/**
 * Middleware de validation générique.
 *
 * @param {import("zod").ZodType} schema
 * @param {"body"|"query"|"params"} source
 * @returns {Function}
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: result.error.issues.map((issue) => ({
          champ: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (source === "body") {
      req.body = result.data;
    } else if (source === "query") {
      req.validatedQuery = result.data;
    } else {
      req.validatedParams = result.data;
    }

    next();
  };
};

module.exports = {
  validate,
  createBatimentSchema,
  getBatimentsSchema,
  getBatimentSchema,
  updateBatimentSchema,
  deleteBatimentSchema,
};