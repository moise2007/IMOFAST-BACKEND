const { z } = require("zod");

/* -------------------------------------------------------------------------- */
/*  Constantes & helpers                                                      */
/* -------------------------------------------------------------------------- */

const MAX_EXEMPLAIRES = 5000;
const ETATS = ["libre", "occuper", "construction"];

/** type spécial -> nom du flag envoyé par le client */
const SPECIAL_TYPES = {
  bureau: "isBureau",
  boutique: "isBoutique",
  terrain: "isTerrain",
};

const emptyToUndefined = (v) =>
  v === "" || v === "null" || v === "undefined" ? undefined : v;

const booleanFromQuery = (v) => {
  if (v === true || v === "true" || v === "1") return true;
  if (v === false || v === "false" || v === "0") return false;
  return undefined;
};

const str = () => z.string().trim();
const optStr = () => z.preprocess(emptyToUndefined, str().optional());
const num = () => z.coerce.number();
const coord = () =>
  z.preprocess(emptyToUndefined, z.coerce.number().nullable().optional());
const flag = () => z.boolean().optional();

/* -------------------------------------------------------------------------- */
/*  Blocs communs                                                             */
/* -------------------------------------------------------------------------- */

/** Champs communs à bureau / boutique / terrain (voir les modèles) */
const commonSpecialShape = {
  superficie: num().positive("La superficie doit être supérieure à 0"),
  pays: optStr(),
  ville: str().min(1, "La ville est obligatoire"),
  quartier: str().min(1, "Le quartier est obligatoire"),
  lieuDit: optStr(),
  lon: coord(),
  lat: coord(),
  distanceGoudron: z.preprocess(
    emptyToUndefined,
    num().nonnegative().nullable().optional()
  ),
  etat: z.enum(ETATS).optional(),
  idCommun: optStr(),
  images: z.array(z.any()).optional(),
  videos: z.array(z.any()).optional(),
  videosVirtuelle: z.record(z.any()).optional(),
};

/** { libre|disponible, occuper, construction } -> entiers >= 0 */
const exemplairesSchema = z
  .object({
    libre: z.coerce.number().int().nonnegative().optional(),
    disponible: z.coerce.number().int().nonnegative().optional(),
    occuper: z.coerce.number().int().nonnegative().default(0),
    construction: z.coerce.number().int().nonnegative().default(0),
  })
  .transform(({ libre, disponible, occuper, construction }) => ({
    libre: libre ?? disponible ?? 0,
    occuper,
    construction,
  }))
  .superRefine((u, ctx) => {
    const total = u.libre + u.occuper + u.construction;
    if (total < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le nombre d'exemplaires est invalide (minimum 1)",
      });
    }
    if (total > MAX_EXEMPLAIRES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Le nombre d'exemplaires ne peut pas dépasser ${MAX_EXEMPLAIRES}`,
      });
    }
  });

/* -------------------------------------------------------------------------- */
/*  Schémas par type                                                          */
/* -------------------------------------------------------------------------- */

const bureauSchema = z
  .object({
    ...commonSpecialShape,
    forme: optStr(),
    dimension: z.any().optional(),
    niveau: z.coerce.number().int().optional(),
    nombrePieces: z.coerce.number().int().positive().optional(),
    salleReunion: flag(),
    accueil: flag(),
    parking: flag(),
    eau: flag(),
    electricite: flag(),
    toilettes: flag(),
    climatisation: flag(),
    internet: flag(),
    titre: flag(),
  })
  .strip();

const boutiqueSchema = z
  .object({
    ...commonSpecialShape,
    etage: z.coerce.number().int().optional(),
    nombrePieces: z.coerce.number().int().positive().optional(),
    parking: flag(),
    eau: flag(),
    electricite: flag(),
    toilettes: flag(),
    climatisation: flag(),
  })
  .strip();

const terrainSchema = z
  .object({
    ...commonSpecialShape,
    type: optStr(), // ex : constructible, agricole...
    forme: optStr(),
    dimension: z.any().optional(),
    titre: flag(),
  })
  .strip();

/**
 * Logement (= "bien" classique).
 * En brouillon, tout est optionnel ; sinon les champs clés sont obligatoires.
 */
const logementBase = z
  .object({
    nom: optStr(),
    type: optStr(),
    nature: optStr(),
    etat: optStr(),
    mode: optStr(),
    niveauFinition: optStr(),
    description: optStr(),
    brouillon: z.boolean().optional(),

    // le modèle stocke images en objet, les autres en tableau : on accepte les deux
    images: z.union([z.array(z.any()), z.record(z.any())]).optional(),
    videos: z.array(z.any()).optional(),

    etage: z
      .object({
        min: z.preprocess(emptyToUndefined, z.coerce.number().optional()),
        max: z.preprocess(emptyToUndefined, z.coerce.number().optional()),
      })
      .optional(),

    superficie: num().nonnegative().optional(),

    exemplaire: z.any().optional(),
    exemplaires: z.any().optional(),

    chambres: z.any().optional(),
    salons: z.any().optional(),
    cuisines: z.any().optional(),
    salleBains: z.any().optional(),
    localisation: z.any().optional(),
    equipements: z.any().optional(),
    securite: z.any().optional(),
    environements: z.any().optional(),
    eau: z.any().optional(),
    electricite: z.any().optional(),
  })
  .passthrough();

const hasImages = (images) =>
  Array.isArray(images)
    ? images.length > 0
    : !!images && Object.keys(images).length > 0;

const logementSchema = logementBase.superRefine((data, ctx) => {
  if (data.brouillon) return;

  const required = [
    ["images", hasImages(data.images)],
    ["etage", data.etage?.min != null],
    ["nature", !!data.nature],
    ["type", !!data.type],
    ["etat", !!data.etat],
  ];

  for (const [field, valid] of required) {
    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Le champ ${field} est obligatoire`,
        path: [field],
      });
    }
  }
});

const ENTITY_SCHEMAS = {
  bureau: bureauSchema,
  boutique: boutiqueSchema,
  terrain: terrainSchema,
  logement: logementSchema,
};

/* -------------------------------------------------------------------------- */
/*  Détection du type                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Retourne { type } ou { error }.
 * Format attendu :  { isBureau: true, bureau: {...} }
 * Fallback        :  { type: "bureau", ... }  (format plat)
 * Aucun des deux  :  logement
 */
const detectType = (body = {}) => {
  const flagged = Object.keys(SPECIAL_TYPES).filter(
    (t) => body[SPECIAL_TYPES[t]] === true
  );

  if (flagged.length > 1) {
    return { error: "Un seul type spécial peut être sélectionné" };
  }

  const flat = Object.keys(SPECIAL_TYPES).includes(body.type)
    ? body.type
    : null;

  if (flagged.length === 1) {
    if (flat && flat !== flagged[0]) {
      return { error: "Les types du bien sont incohérents" };
    }
    return { type: flagged[0], nested: true };
  }

  if (flat) return { type: flat, nested: false };

  return { type: "logement", nested: false };
};

/* -------------------------------------------------------------------------- */
/*  Middleware de création                                                    */
/* -------------------------------------------------------------------------- */

const fail = (res, errors) =>
  res.status(400).json({
    success: false,
    message: "Données invalides",
    errors,
  });

const zodErrors = (error, prefix = "") =>
  error.issues.map((i) => ({
    champ: [prefix, i.path.join(".")].filter(Boolean).join("."),
    message: i.message,
  }));

/**
 * Valide la création d'un bien selon son type.
 *
 * Après validation, req.body vaut :
 *   {
 *     typeBien: "bureau" | "boutique" | "terrain" | "logement",
 *     data: { ...champs validés de l'entité },
 *     exemplaires: { libre, occuper, construction },   // bureau/boutique/terrain
 *     ...
 *   }
 */
const validateCreateBien = (req, res, next) => {
  const body = req.body ?? {};
  const detected = detectType(body);

  if (detected.error) {
    return fail(res, [{ champ: "type", message: detected.error }]);
  }

  const { type, nested } = detected;

  /* ----------------------------- Logement -------------------------------- */
  if (type === "logement") {
    const result = logementSchema.safeParse(body);
    if (!result.success) return fail(res, zodErrors(result.error));

    req.body = { typeBien: "logement", data: result.data };
    return next();
  }

  /* ------------------------ Bureau / Boutique / Terrain ------------------- */
  // format imbriqué : body[type] ; format plat : le body lui-même
  const rawEntity = nested ? body[type] : body;

  if (
    !rawEntity ||
    typeof rawEntity !== "object" ||
    Array.isArray(rawEntity)
  ) {
    return fail(res, [
      { champ: type, message: `Les données du ${type} sont obligatoires` },
    ]);
  }

  const entityResult = ENTITY_SCHEMAS[type].safeParse(rawEntity);
  if (!entityResult.success) {
    return fail(res, zodErrors(entityResult.error, nested ? type : ""));
  }

  // Exemplaires : entité > body > nombreBureaux (bureau) > 1 libre par défaut
  let rawUnits = rawEntity.exemplaires ?? body.exemplaires;

  if (rawUnits === undefined) {
    const count = type === "bureau" ? Number(body.nombreBureaux ?? 1) : 1;

    if (!Number.isInteger(count) || count < 1 || count > MAX_EXEMPLAIRES) {
      return fail(res, [
        { champ: "nombreBureaux", message: "Le nombre d'exemplaires est invalide" },
      ]);
    }
    rawUnits = { libre: count };
  }

  const unitsResult = exemplairesSchema.safeParse(rawUnits);
  if (!unitsResult.success) {
    return fail(res, zodErrors(unitsResult.error, "exemplaires"));
  }

  req.body = {
    typeBien: type,
    data: entityResult.data,
    exemplaires: unitsResult.data,
  };

  next();
};

/* -------------------------------------------------------------------------- */
/*  Autres schémas (inchangés)                                                */
/* -------------------------------------------------------------------------- */

const getBienSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "L'identifiant du bien est obligatoire")
    .max(100, "L'identifiant du bien est invalide"),
});

const deleteBienSchema = getBienSchema;

const boolQuery = () => z.preprocess(booleanFromQuery, z.boolean().optional());
const intQuery = () => z.coerce.number().int().nonnegative().optional();

const getBiensSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),

  bailleurId: optStr(),
  nature: optStr(),
  type: optStr(),
  ville: optStr(),
  quartier: optStr(),
  niveau: optStr(),
  mode: optStr(),

  nombreChambre: intQuery(),
  nombreSalleBain: intQuery(),
  superficie: z.coerce.number().nonnegative().optional(),
  etageMax: intQuery(),

  camera: boolQuery(),
  barriere: boolQuery(),
  wifi: boolQuery(),
  televiseur: boolQuery(),
  parking: boolQuery(),
  piscine: boolQuery(),
  ascenseur: boolQuery(),
  refrigerateur: boolQuery(),
  cuisine: boolQuery(),
  hopital: boolQuery(),
  ecole: boolQuery(),
  marche: boolQuery(),
});

const champsProteges = [
  "idPublic",
  "bailleurId",
  "createdAt",
  "updateAt",
  "vues",
  "_id",
];

const updateBienSchema = z
  .object({})
  .passthrough()
  .refine(
    (data) => Object.keys(data).some((k) => !champsProteges.includes(k)),
    { message: "Aucun champ à modifier" }
  );

/** Middleware générique (inchangé) */
const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) return fail(res, zodErrors(result.error));

  if (source === "body") req.body = result.data;
  else if (source === "query") req.validatedQuery = result.data;
  else req.validatedParams = result.data;

  next();
};

module.exports = {
  validate,
  validateCreateBien,
  getBiensSchema,
  getBienSchema,
  updateBienSchema,
  deleteBienSchema,
  // exportés pour les tests
  bureauSchema,
  boutiqueSchema,
  terrainSchema,
  logementSchema,
  exemplairesSchema,
  detectType,
};