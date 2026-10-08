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
  value === "" || value === "null" || value === "undefined"
    ? undefined
    : value;

/**
 * Schéma de création d'une annonce.
 */
const createAnnonceSchema = z.object({
  titre: z
    .string({
      message: "le titre est obligatoire",
    })
    .trim()
    .min(3, "le titre doit contenir au moins 3 caractères")
    .max(150, "le titre ne peut pas dépasser 150 caractères"),

  description: z
    .string({
      message: "la description est obligatoire",
    })
    .trim()
    .min(10, "la description doit contenir au moins 10 caractères"),

  bienId: z
    .string({
      message: "l'identifiant du bien est obligatoire",
    })
    .trim()
    .min(1, "identifiant du bien invalide")
    .max(50, "identifiant du bien invalide"),

  loyer: z
    .array(
      z.object({
        prix: z.coerce
          .number({
            message: "le prix du loyer doit être un nombre",
          })
          .int("le prix du loyer doit être un entier")
          .min(0, "le prix du loyer ne peut pas être négatif"),

        frequence: z.string().trim().optional(),
      })
    )
    .min(1, "le loyer est obligatoire"),

  devise: z
    .string({
      message: "la devise est obligatoire",
    })
    .trim()
    .min(1, "la devise est obligatoire")
    .toUpperCase(),

  dateExpiration: z
    .preprocess(
      emptyToUndefined,
      z.coerce.date({
        message: "la date d'expiration est invalide",
      })
    )
    .optional(),
});

/**
 * Schéma utilisé pour récupérer une liste d'annonces.
 *
 * Les paramètres page et limit sont normalisés ici afin
 * que le service reçoive directement des nombres.
 */
const getAnnoncesSchema = z
  .object({
    page: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "la page doit être un nombre",
        })
        .int("la page doit être un entier")
        .min(1, "la page doit être supérieure ou égale à 1")
        .default(1)
    ),

    limit: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "la limite doit être un nombre",
        })
        .int("la limite doit être un entier")
        .min(1, "la limite doit être supérieure ou égale à 1")
        .max(50, "la limite ne peut pas dépasser 50")
        .default(10)
    ),

    search: z.preprocess(
      emptyToUndefined,
      z.string().trim().optional()
    ),

    titre: z.preprocess(
      emptyToUndefined,
      z.string().trim().optional()
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
          message: "prixMin doit être un nombre",
        })
        .min(0, "prixMin ne peut pas être négatif")
        .optional()
    ),

    prixMax: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "prixMax doit être un nombre",
        })
        .min(0, "prixMax ne peut pas être négatif")
        .optional()
    ),

    natureAnnonce: z.preprocess(
      emptyToUndefined,
      z.enum(["vente", "location"], {
        message: "nature de l'annonce invalide",
      }).optional()
    ),

    type: z.preprocess(
      emptyToUndefined,
      z.enum(
        ["appartement", "villa", "duplex", "studio", "chambre"],
        {
          message:
            "type invalide (appartement, villa, duplex, studio ou chambre)",
        }
      ).optional()
    ),

    nature: z.preprocess(
      emptyToUndefined,
      z.enum(["moderne", "simple", "meubler"], {
        message: "nature invalide (moderne, simple ou meubler)",
      }).optional()
    ),

    nombreChambre: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "le nombre de chambres doit être un nombre",
        })
        .int("le nombre de chambres doit être un entier")
        .min(0, "le nombre de chambres ne peut pas être négatif")
        .optional()
    ),

    nombreDouche: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({
          message: "le nombre de douches doit être un nombre",
        })
        .int("le nombre de douches doit être un entier")
        .min(0, "le nombre de douches ne peut pas être négatif")
        .optional()
    ),
  })
  .refine(
    (data) =>
      data.prixMin === undefined ||
      data.prixMax === undefined ||
      data.prixMin <= data.prixMax,
    {
      message: "prixMin doit être inférieur ou égal à prixMax",
      path: ["prixMin"],
    }
  );

/**
 * Schéma permettant de récupérer une annonce.
 */
const getAnnonceSchema = z.object({
  id: z
    .string({
      message: "l'identifiant est obligatoire",
    })
    .trim()
    .min(1, "identifiant invalide")
    .max(50, "identifiant invalide"),
});

/**
 * Schéma permettant de supprimer une annonce.
 */
const deleteAnnonceSchema = z.object({
  id: z
    .string({
      message: "l'identifiant est obligatoire",
    })
    .trim()
    .min(1, "identifiant invalide")
    .max(50, "identifiant invalide"),
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
    message: "aucun champ à modifier",
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

module.exports = {
  createAnnonceSchema,
  getAnnoncesSchema,
  getAnnonceSchema,
  updateAnnonceSchema,
  deleteAnnonceSchema,
  validate,
};