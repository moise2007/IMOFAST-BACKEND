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



const hasImages = (images) =>
  Array.isArray(images)
    ? images.length > 0
    : !!images && Object.keys(images).length > 0;


const K = {
  required: 'validation.required',
  invalidType: 'validation.invalid_type',
  choice: 'validation.invalid_choice',
  integer: 'validation.integer',
  url: 'validation.url',
  strMin: 'validation.string.too_small',
  strMax: 'validation.string.too_big',
  numMin: 'validation.number.too_small',
  numMax: 'validation.number.too_big',
  arrMin: 'validation.array.too_small',
  arrMax: 'validation.array.too_big',
  amount: 'validation.amount.invalid',
  superficie: 'validation.superficie.positive',
  etage: 'validation.etage.max_lt_min',
  chars: 'validation.chars_not_allowed',
  nameForbidden: 'validation.name_forbidden',
  tooMany: 'validation.too_many_entries',
  etapeMax: "validation.etpage_max"
};
 
// Erreur de type : champ absent -> required, mauvais type -> invalid_type
const typeError = (iss) => (iss.input === undefined ? K.required : K.invalidType);
 
// ---------- Constructeurs de base ----------
const texte = () => z.string({ error: typeError });
const nombre = () => z.number({ error: typeError });
const int = () => nombre().int(K.integer);
const bool = () => z.boolean({ error: typeError });
const obj = (shape) => z.object(shape, { error: typeError });
const arr = (item) => z.array(item, { error: typeError });
const choice = (values) =>
  z.enum(values, {
    error: (iss) => (iss.input === undefined ? K.required : K.choice),
  });
 
const boolNullable = bool().nullable();
const entier = () => int().min(0, K.numMin); // entier >= 0
const urlStr = () => texte().url(K.url);
 
// ---------- Schémas réutilisables ----------
const coordonnee = (min, max) =>
  z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce
      .number({ error: typeError })
      .min(min, K.numMin)
      .max(max, K.numMax)
      .optional(),
  );
 
// Clés libres : 50 caractères max par nom, 50 entrées max
const optionsLibresSchema = z
  .record(
    texte()
      .trim()
      .min(1, K.strMin)
      .max(50, K.strMax)
      .regex(/^[\p{L}\p{N} _'-]+$/u, K.chars)
      .refine((k) => !['__proto__', 'constructor', 'prototype'].includes(k), {
        message: K.nameForbidden,
      }),
    boolNullable,
    { error: typeError },
  )
  .refine((o) => Object.keys(o).length <= 50, { message: K.tooMany });
 
// Nombre ou chaîne de chiffres -> nombre
const montantSchema = z
  .union(
    [
      nombre().min(0, K.amount),
      texte().trim().regex(/^\d+(\.\d+)?$/, K.amount),
    ],
    { error: (iss) => (iss.input === undefined ? K.required : K.amount) },
  )
  .transform((v) => Number(v));
 
const compteurSchema = obj({
  type: choice(['postpayer', 'prepayer', 'fixe']),
  prix: montantSchema,
});
 
const superficieSchema = montantSchema.refine((v) => v > 0, {
  message: K.superficie,
});
 
// ---------- Schéma principal ----------
const logementSchema = obj({
  type: choice(['maison', 'appartement', 'studio', 'chambre', 'villa', 'duplex']),
  typeBien: choice(['logement', 'terrain', 'boutique', 'bureau']),
  nature: choice(['moderne', 'simple', 'meubler']),
  description: texte().trim().max(2000, K.strMax).default(''),
  mode: choice(['complet', 'rapide']),
 
  exemplaire: obj({
    occuper: entier(),
    libre: entier(),
    construction: entier(),
  }),
 
  localisation: obj({
    lon: coordonnee(-180, 180),
    lat: coordonnee(-90, 90),
    pays: texte().trim().min(2, K.strMin),
    ville: texte().trim().min(2, K.strMin),
    quartier: texte().trim().min(2, K.strMin),
    adresse: texte().trim().optional(),
  }),
 
  prixGoudron: montantSchema,
  devise: choice(['XAF', 'EUR', 'USD']),
  images: arr(urlStr()).min(4, K.arrMin).max(18, K.arrMax),
  videos: arr(urlStr()).min(0, K.arrMin).max(5, K.arrMax),
  superficie: superficieSchema,
 
  securite: obj({
    gardien: boolNullable,
    camera: boolNullable,
    barriere: boolNullable,
    quartierSecuriser: boolNullable,
    eclairagePublic: boolNullable,
    Conciergerie: boolNullable,
  }),
 
  eau: compteurSchema,
  electricite: compteurSchema,
  estProcheGoudron: boolNullable,
 
  chambres: entier(),
  salleBains: entier(),
  cuisines: entier(),
  salons: entier(),
 
  etage: obj({
    min: entier(),
    max: entier(),
  }).refine((e) => e.max >= e.min, {
    message: K.etage,
    path: ['max'],
  }),
 
  niveauFinition: choice([
    'fini',
    'bon_standing',
    'haut_standing',
    'luxe',
    'tres_haut_standing',
  ]),
 
  equipements: optionsLibresSchema,
  environements: optionsLibresSchema,
}).superRefine((data, ctx) => {
  const { occuper, libre, construction } = data.exemplaire ?? {};
  const { min, max } = data.etage ?? {};
 
  if (![occuper, libre, construction, min, max].every(Number.isInteger)) return;
 
  const total = occuper + libre + construction;
  if (total === 0) return;
 
  if (max < min && total > 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['etage', 'max'],
      message: K.etapeMax,
      params: { total, max },
    });
  }
});

const bureauSchema = z
  .object({
    superficie: superficieSchema,
    typeBien:  choice(['logement', 'terrain', 'boutique', 'bureau']),
    dimension: z.string().trim().optional().nullable(),
    exemplaire: obj({
      occuper: entier(),
      libre: entier(),
      construction: entier(),
    }), 
    salleReunion:  boolNullable,
    accueil:  boolNullable,
    parking:  boolNullable,
    eau: compteurSchema,
    electricite: compteurSchema,
    toilettes:  boolNullable,
    climatisation:  boolNullable,
    internet:  boolNullable,

    lon: coordonnee(-180, 180),
    lat: coordonnee(-90, 90),
    pays: texte().trim().min(2, K.strMin),
    ville: texte().trim().min(2, K.strMin),
    quartier: texte().trim().min(2, K.strMin),
    adresse: texte().trim().optional(),

    prixGoudron: montantSchema,
    etage: obj({
      min: entier(),
      max: entier(),
    }).refine((e) => e.max >= e.min, {
      message: K.etage,
      path: ['max'],
    }),
    
    images: arr(urlStr()).min(4, K.arrMin).max(18, K.arrMax),
    videos: arr(urlStr()).min(0, K.arrMin).max(5, K.arrMax),
  })



const ENTITY_SCHEMAS = {
  bureau: bureauSchema,
  boutique: boutiqueSchema,
  terrain: terrainSchema,
  logement: logementSchema,
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

const zodErrors = (error) =>
  error.issues.map((i) => ({
    champ: i.path.join("."),
    message: i.message,
  }));


const validateCreateBien = (req, res, next) => {
  const body = req.body ?? {};
  const type = body?.typeBien;

  if (!["logement","boutique","bureau","terrain"].includes(body?.typeBien)) {
    return fail(res, [{ champ: "type", message: "le type de bien est invalide" }]);
  }

  const validator = ENTITY_SCHEMAS[type]

  const result = validator.safeParse(body)
  
  if(result.success){
    req.body = {
      ...result.data,
      typeBien: type
    }
    return next()
  }
  console.log("verification echouer")
  
  return res.status(400).json({
    success: false,
    message: "les donnees sont invalides",
    errors: zodErrors(result.error)
  })
  
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
};