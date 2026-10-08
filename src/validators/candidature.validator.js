const { z } = require("zod");

/**
 * Schéma de création d'une candidature.
 *
 * @type {import("zod").ZodObject}
 */
const createCandidatureSchema = z.object({
  annonceId: z.string().min(1, "annonceId est requis"),

  type: z.enum(["visite", "demande"]),

  message: z.string().optional(),

  visite: z
    .object({
      dateSouhaitee: z.string().optional(),
      heureSouhaitee: z.string().optional(),
      horaireFlexible: z.boolean().optional(),
      fraisVisite: z.number().nonnegative().optional(),
      devise: z.string().optional(),
    })
    .optional(),

  demande: z
    .object({
      prix: z.number().nonnegative().optional(),
      devise: z.string().optional(),
      duree: z
        .object({
          unite: z.string().optional(),
        })
        .optional(),
      frequence: z.string().optional(),
      caution: z.number().nonnegative().optional(),
      min: z.number().nonnegative().optional(),
      fraisVisite: z.number().nonnegative().optional(),
    })
    .optional(),
});

/**
 * Schéma utilisé pour les paramètres contenant un id.
 *
 * @type {import("zod").ZodObject}
 */
const candidatureActionSchema = z.object({
  id: z.string().min(1, "L'identifiant est requis"),
});

/**
 * Schéma de récupération d'une candidature.
 *
 * @type {import("zod").ZodObject}
 */
const getCandidatureSchema = candidatureActionSchema;

/**
 * Schéma de modification d'une candidature.
 *
 * @type {import("zod").ZodObject}
 */
const updateCandidatureSchema = z.object({
  demande: z
    .object({
      prix: z.number().nonnegative().optional(),
      devise: z.string().optional(),
      duree: z
        .object({
          unite: z.string().optional(),
        })
        .optional(),
      frequence: z.string().optional(),
      caution: z.number().nonnegative().optional(),
      min: z.number().nonnegative().optional(),
      fraisVisite: z.number().nonnegative().optional(),
    })
    .optional(),

  visite: z
    .object({
      dateSouhaitee: z.string().optional(),
      heureSouhaitee: z.string().optional(),
      horaireFlexible: z.boolean().optional(),
      fraisVisite: z.number().nonnegative().optional(),
      devise: z.string().optional(),
    })
    .optional(),
});

/**
 * Schéma de programmation d'une visite.
 *
 * @type {import("zod").ZodObject}
 */
const programmerCandidatureSchema = z.object({
  date: z.string().min(1, "La date est requise"),
  time: z.string().min(1, "L'heure est requise"),
});

/**
 * Schéma de recherche des candidatures.
 *
 * @type {import("zod").ZodObject}
 */
const getCandidaturesSchema = z.object({
  annonceId: z.string().optional(),

  type: z.enum(["visite", "demande"]).optional(),

  statut: z
    .enum([
      "en_attente",
      "visitePrevue",
      "dossierRetenu",
      "refuser",
      "annuler",
    ])
    .optional(),

  vu: z
    .union([
      z.boolean(),
      z.enum(["true", "false"]),
    ])
    .optional(),

  minDate: z.string().optional(),

  maxDate: z.string().optional(),

  lastId: z.string().optional(),

  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional(),
});

/**
 * Middleware générique de validation.
 *
 * Le résultat validé est placé dans :
 *
 * - req.validatedBody
 * - req.validatedParams
 * - req.validatedQuery
 *
 * selon la source sélectionnée.
 *
 * @param {import("zod").ZodSchema} schema
 * @param {"body"|"params"|"query"} source
 * @returns {import("express").RequestHandler}
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten(),
      });
    }

    const propertyName =
      `validated${source.charAt(0).toUpperCase()}${source.slice(1)}`;

    req[propertyName] = result.data;

    next();
  };
}

module.exports = {
  validate,
  createCandidatureSchema,
  getCandidaturesSchema,
  getCandidatureSchema,
  updateCandidatureSchema,
  candidatureActionSchema,
  programmerCandidatureSchema,
};