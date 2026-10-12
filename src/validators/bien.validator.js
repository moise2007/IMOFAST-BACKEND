const { z } = require("zod");

const SPECIAL_TYPES = [
  "bureau",
  "boutique",
  "terrain",
];

/**
 * Transforme les valeurs vides en undefined.
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
 * Convertit les valeurs booléennes provenant
 * notamment des query params.
 *
 * @param {*} value
 * @returns {boolean|undefined}
 */
const booleanFromQuery = (value) => {
  if (
    value === true ||
    value === "true" ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === "0"
  ) {
    return false;
  }

  return undefined;
};

/**
 * Validation des données de création d'un bien.
 */
const createBienSchema = z
  .object({
    nom: z.string().trim().optional(),

    type: z.string().trim().optional(),

    nature: z.string().trim().optional(),

    etat: z.string().trim().optional(),

    images: z.array(z.any()).optional(),

    etage: z
      .object({
        min: z.coerce.number().optional(),
        max: z.coerce.number().optional(),
      })
      .optional(),

    superficie: z.coerce
      .number()
      .nonnegative()
      .optional(),

    exemplaire: z.any().optional(),

    exemplaires: z.any().optional(),

    brouillon: z
      .boolean()
      .optional(),

    isBureau: z.boolean().optional(),

    isBoutique: z.boolean().optional(),

    isTerrain: z.boolean().optional(),

    bureau: z.any().optional(),

    boutique: z.any().optional(),

    terrain: z.any().optional(),

    nombreBureaux: z.coerce
      .number()
      .int()
      .positive()
      .max(5000)
      .optional(),

    chambres: z.any().optional(),

    salleBains: z.any().optional(),

    localisation: z.any().optional(),

    equipements: z.any().optional(),

    securite: z.any().optional(),

    environements: z.any().optional(),

    mode: z.string().trim().optional(),

    niveauFinition: z
      .string()
      .trim()
      .optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const selectedTypes =
      SPECIAL_TYPES.filter(
        (type) =>
          data[
            `is${type[0].toUpperCase()}${type.slice(1)}`
          ] === true
      );

    if (selectedTypes.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Un seul type spécial peut être sélectionné",
        path: ["type"],
      });

      return;
    }

    const flatType =
      SPECIAL_TYPES.includes(data.type)
        ? data.type
        : null;

    if (
      selectedTypes.length === 1 ||
      flatType
    ) {
      const legacyFlags =
        selectedTypes.length === 1;

      const type = legacyFlags
        ? selectedTypes[0]
        : flatType;

      if (
        legacyFlags &&
        flatType &&
        flatType !== type
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Les types du bien sont incohérents",
          path: ["type"],
        });

        return;
      }

      if (legacyFlags) {
        const entity = data[type];

        if (
          !entity ||
          typeof entity !== "object" ||
          Array.isArray(entity)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              `Les données du ${type} sont obligatoires`,
            path: [type],
          });

          return;
        }

        const units =
          entity.exemplaires ??
          data.exemplaires ??
          {};

        const counts = [
          units.libre ??
            units.disponible,
          units.occuper,
          units.construction,
        ].map((value) =>
          Number(value ?? 0)
        );

        const total =
          counts.reduce(
            (sum, value) =>
              sum + value,
            0
          );

        if (
          counts.some(
            (value) =>
              !Number.isInteger(value) ||
              value < 0
          ) ||
          total < 1
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Le nombre d'exemplaires est invalide",
            path: [type],
          });
        }

        if (total > 5000) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Le nombre d'exemplaires ne peut pas dépasser 5000",
            path: [type],
          });
        }
      } else {
        const count =
          type === "bureau"
            ? Number(
                data.nombreBureaux ?? 1
              )
            : 1;

        if (
          !Number.isInteger(count) ||
          count < 1 ||
          count > 5000
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Le nombre d'exemplaires est invalide",
            path: [type],
          });
        }
      }

      return;
    }

    if (!data.brouillon) {
      const requiredFields = [
        [
          "images",
          Array.isArray(data.images) &&
            data.images.length > 0,
        ],
        [
          "etage",
          data.etage?.min != null,
        ],
        [
          "nature",
          Boolean(data.nature),
        ],
        [
          "type",
          Boolean(data.type),
        ],
        [
          "etat",
          Boolean(data.etat),
        ],
      ];

      for (
        const [field, valid]
        of requiredFields
      ) {
        if (!valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              `Le champ ${field} est obligatoire`,
            path: [field],
          });
        }
      }
    }
  });

/**
 * Schéma de récupération d'un bien.
 */
const getBienSchema = z.object({
  id: z
    .string()
    .trim()
    .min(
      1,
      "L'identifiant du bien est obligatoire"
    )
    .max(
      100,
      "L'identifiant du bien est invalide"
    ),
});

/**
 * Schéma de suppression.
 */
const deleteBienSchema =
  getBienSchema;

/**
 * Schéma de récupération paginée
 * et filtrée des biens.
 */
const getBiensSchema = z.object({
  /**
   * Pagination.
   */
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10),

  /**
   * Filtres métier.
   */
  bailleurId: z.preprocess(
    emptyToUndefined,
    z.string().trim().optional()
  ),

  nature: z.preprocess(
    emptyToUndefined,
    z.string().trim().optional()
  ),

  type: z.preprocess(
    emptyToUndefined,
    z.string().trim().optional()
  ),

  ville: z.preprocess(
    emptyToUndefined,
    z.string().trim().optional()
  ),

  quartier: z.preprocess(
    emptyToUndefined,
    z.string().trim().optional()
  ),

  niveau: z.preprocess(
    emptyToUndefined,
    z.string().trim().optional()
  ),

  mode: z.preprocess(
    emptyToUndefined,
    z.string().trim().optional()
  ),

  nombreChambre: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional(),

  nombreSalleBain: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional(),

  superficie: z.coerce
    .number()
    .nonnegative()
    .optional(),

  etageMax: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional(),

  camera: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  barriere: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  wifi: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  televiseur: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  parking: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  piscine: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  ascenseur: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  refrigerateur: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  cuisine: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  hopital: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  ecole: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),

  marche: z.preprocess(
    booleanFromQuery,
    z.boolean().optional()
  ),
});

/**
 * Champs protégés qui ne peuvent jamais
 * être modifiés par le client.
 */
const champsProteges = [
  "idPublic",
  "bailleurId",
  "createdAt",
  "updateAt",
  "vues",
  "_id",
];

/**
 * Schéma de modification.
 */
const updateBienSchema = z
  .object({})
  .passthrough()
  .refine(
    (data) =>
      Object.keys(data).some(
        (key) =>
          !champsProteges.includes(key)
      ),
    {
      message:
        "Aucun champ à modifier",
    }
  );

/**
 * Middleware de validation générique.
 *
 * @param {import("zod").ZodType} schema
 * @param {"body"|"query"|"params"} source
 * @returns {Function}
 */
const validate = (
  schema,
  source = "body"
) => {
  return (req, res, next) => {
    const result =
      schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors:
          result.error.issues.map(
            (issue) => ({
              champ:
                issue.path.join("."),
              message:
                issue.message,
            })
          ),
      });
    }

    if (source === "body") {
      req.body = result.data;
    } else if (
      source === "query"
    ) {
      req.validatedQuery =
        result.data;
    } else {
      req.validatedParams =
        result.data;
    }

    next();
  };
};

module.exports = {
  validate,
  createBienSchema,
  getBiensSchema,
  getBienSchema,
  updateBienSchema,
  deleteBienSchema,
};