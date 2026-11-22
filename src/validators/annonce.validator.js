const { z } = require("zod");

/**
 * Transforme les valeurs vides provenant des query parameters
 * en undefined.
 *
 * Les query parameters arrivent toujours sous forme de chaînes.
 *
 * Exemple :
 * ?prixMin=
 * ?prixMax=null
 *
 * deviennent :
 * {
 *   prixMin: undefined,
 *   prixMax: undefined
 * }
 *
 * @param {*} value Valeur reçue.
 * @returns {*} Valeur normalisée.
 */
const emptyToUndefined = (value) =>
  value === null ||
  value === "" ||
  value === "null" ||
  value === "undefined"
    ? undefined
    : value;

/**
 * Schéma de création d'une annonce.
 */
const publicationStatus = z.enum(['brouillon', 'programmee', 'programmée', 'publier', 'active', 'en_ligne', 'en ligne', 'suspendus', 'expirer', 'louer']);
const createAnnonceSchema = z.object({
  nature: z.enum(['location', 'vente']).optional(),
  status: publicationStatus.optional(),
  datePublication: z.string().datetime({ offset: true }).nullable().optional(),
  titre: z
    .string({
      message: "errors:backend.invalidInput",
    })
    .trim()
    .min(3, "errors:backend.invalidInput")
    .max(150, "errors:backend.invalidInput"),

  description: z
    .string({
      message: "errors:backend.invalidInput",
    })
    .trim()
    .min(10, "errors:backend.invalidInput"),

  bienId: z
    .string({
      message: "errors:backend.invalidInput",
    })
    .trim()
    .min(1, "errors:backend.invalidInput")
    .max(50, "errors:backend.invalidInput"),

  loyer: z.union([
    z.array(
      z.object({
        caution: z.number().nonnegative(),
        duree: z.enum(["annee", "mois", "semaine", "jour"]),
        fraisVisite: z.number().nonnegative(),
        min: z.number().int().min(1).max(1200).optional(),
        prix: z.number().nonnegative(),
        valeur: z.literal(1).optional(),
      })
    ).min(1).max(10),

    z.object({
      prix: z.number().nonnegative(),
    })
  ]),

  devise: z
    .string({
      message: "errors:backend.invalidInput",
    })
    .trim()
    .min(1, "errors:backend.invalidInput")
    .toUpperCase(),

  dateExpiration: z.preprocess(
    (value) => value === "" || value === "null" ? null : value,
    z.coerce.date().nullable()
  ).optional(),
});

/**
 * Schéma utilisé pour récupérer une liste d'annonces.
 *
 * Les paramètres page et limit sont normalisés ici afin
 * que le service reçoive directement des nombres.
 */
const getAnnoncesSchema = z
  .object({
    status: publicationStatus.optional(),
    duree: z.enum(['annee', 'mois', 'semaine', 'jour']).optional(),
    nombreDurees: z.coerce.number().int().min(1).max(1200).optional(),
    sort: z.enum(["recent", "populaire", "prixCroissant", "prixDecroissant"]).optional(),
    page: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "errors:backend.invalidInput",
        })
        .int("errors:backend.invalidInput")
        .min(1, "errors:backend.invalidInput").max(100)
        .default(1)
    ),

    limit: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "errors:backend.invalidInput",
        })
        .int("errors:backend.invalidInput")
        .min(1, "errors:backend.invalidInput")
        .max(50, "errors:backend.invalidInput")
        .default(10)
    ),

    search: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(256).optional()
    ),

    titre: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(256).optional()
    ),

    ville: z.preprocess(
      emptyToUndefined,
      z.string().trim().toLowerCase().optional()
    ),

    quartier: z.preprocess(
      emptyToUndefined,
      z.string().trim().toLowerCase().optional()
    ),

    devise: z.preprocess(
      emptyToUndefined,
      z.string().trim().toUpperCase().optional()
    ),

    prixMin: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "errors:backend.invalidInput",
        })
        .min(0, "errors:backend.invalidInput")
        .optional()
    ),

    prixMax: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "errors:backend.invalidInput",
        })
        .min(0, "errors:backend.invalidInput")
        .optional()
    ),

    natureAnnonce: z.preprocess(
      emptyToUndefined,
      z.enum(["vente", "location"], {
        message: "errors:backend.invalidInput",
      }).optional()
    ),

    typeBien: z.preprocess(
      emptyToUndefined,
      z.enum(["logement", "terrain", "boutique", "bureau"]).optional()
    ),

    type: z.preprocess(
      emptyToUndefined,
      z.enum(
        ["appartement", "villa", "duplex", "studio", "chambre"],
        {
          message:
            "errors:backend.invalidInput",
        }
      ).optional()
    ),

    nature: z.preprocess(
      emptyToUndefined,
      z.enum(["moderne", "simple", "meubler", "meuble"], {
        message: "errors:backend.invalidInput",
      }).optional()
    ),

    nombreChambre: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "errors:backend.invalidInput",
        })
        .int("errors:backend.invalidInput")
        .min(0, "errors:backend.invalidInput")
        .optional()
    ),

    nombreDouche: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "errors:backend.invalidInput",
        })
        .int("errors:backend.invalidInput")
        .min(0, "errors:backend.invalidInput")
        .optional()
    ),
  })
  .refine(
    (data) =>
      data.prixMin === undefined ||
      data.prixMax === undefined ||
      data.prixMin <= data.prixMax,
    {
      message: "errors:backend.invalidInput",
      path: ["prixMin"],
    }
  );

/**
 * Schéma permettant de récupérer une annonce.
 */
const getAnnonceSchema = z.object({
  id: z
    .string({
      message: "errors:backend.invalidInput",
    })
    .trim()
    .min(1, "errors:backend.invalidInput")
    .max(50, "errors:backend.invalidInput"),
});

/**
 * Schéma permettant de supprimer une annonce.
 */
const deleteAnnonceSchema = z.object({
  id: z
    .string({
      message: "errors:backend.invalidInput",
    })
    .trim()
    .min(1, "errors:backend.invalidInput")
    .max(50, "errors:backend.invalidInput"),
});

/**
 * Champs pouvant être modifiés par le bailleur.
 *
 * Les champs suivants sont volontairement absents :
 * - idPublic
 * - bailleurId
 * - bienId
 *
 * Ils ne doivent jamais être modifiables par le client.
 */
const champsModifiables = {
  titre: true,
  description: true,
  loyer: true,
  devise: true,
  dateExpiration: true,
  datePublication: true,
  status: true,
  nature: true,
};

/**
 * Schéma de modification d'une annonce.
 *
 * Tous les champs sont facultatifs car une modification
 * peut ne concerner qu'une partie de l'annonce.
 *
 * Le strict() empêche l'envoi de champs non autorisés.
 */
const updateAnnonceSchema = createAnnonceSchema
  .pick(champsModifiables)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "errors:backend.invalidInput",
  });

/**
 * Middleware générique de validation Zod.
 *
 * @param {import("zod").ZodSchema} schema Schéma Zod à utiliser.
 * @param {"body"|"query"|"params"} source Source des données.
 * @returns {Function} Middleware Express.
 */
const validate = (schema, source = "body") => (req, res, next) => {


  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: req.t("errors:backend.invalidInput"),
      errors: require('../utils/validationErrors').localizedIssues(result.error, req).map((issue) => ({
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

module.exports = {
  createAnnonceSchema,
  getAnnoncesSchema,
  getAnnonceSchema,
  updateAnnonceSchema,
  deleteAnnonceSchema,
  validate,
};
