const { z } = require("zod");

const createAlerteSchema = z.object({
  type: z.enum(["appartement", "villa", "duplex", "studio", "chambre"], {
    message: "type invalide (appartement, villa, duplex, studio ou chambre)",
  }),
  nature: z.enum(["moderne", "simple", "meubler"], {
    message: "nature invalide (moderne, simple ou meubler)",
  }),
  natureAnnonce: z.enum(["vente", "location"], {
    message: "nature de l'annonce invalide (vente ou location)",
  }),
  ville: z
    .string({ message: "la ville est obligatoire" })
    .trim()
    .min(3, "la ville doit contenir au moins 3 caractères")
    .toLowerCase(),
  quartier: z.string().trim().toLowerCase().optional(),
  prix: z.coerce
    .number({ message: "le prix doit être un nombre" })
    .int("le prix doit être un entier")
    .min(1000, "le prix est trop bas"),
  frequence: z.string().trim().optional(),
  duree: z.coerce.number().int().positive().optional(),
  caution: z.coerce.number().int().min(0).optional(),
  nombreChambre: z.coerce.number().int().min(0).optional(),
  nombreDouche: z.coerce.number().int().min(0).optional(),
  equipements: z.array(z.string().trim()).max(30).optional(),
  securite: z.array(z.string().trim()).max(30).optional(),
});


const emptyToUndefined = (v) =>
  v === "" || v === "null" || v === "undefined" ? undefined : v;

const getAlertesSchema = z
  .object({
    type: z.preprocess(
      emptyToUndefined,
      z.enum(["appartement", "villa", "duplex", "studio", "chambre"]).optional()
    ),
    nature: z.preprocess(
      emptyToUndefined,
      z.enum(["moderne", "simple", "meubler"]).optional()
    ),
    natureAnnonce: z.preprocess(
      emptyToUndefined,
      z.enum(["vente", "location"]).optional()
    ),
    ville: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().optional()),
    quartier: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().optional()),
    prixMin: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
    prixMax: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
    nombreChambre: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
    limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).default(10)),
  })
  .refine(
    (d) => d.prixMin === undefined || d.prixMax === undefined || d.prixMin <= d.prixMax,
    { message: "prixMin doit être inférieur ou égal à prixMax", path: ["prixMin"] }
  );

const deleteAlerteSchema = z.object({
  id: z.string({ message: "l'identifiant est obligatoire" }).trim().min(1, "identifiant invalide").max(50, "identifiant invalide"),
});

// source = "body" (défaut), "query" ou "params"
const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Données invalides",
      errors: result.error.issues.map((i) => ({
        champ: i.path.join("."),
        message: i.message,
      })),
    });
  }

  if (source === "body") req.body = result.data;
  else if (source === "query") req.validatedQuery = result.data;
  else req.validatedParams = result.data;

  next();
};

const getAlerteSchema = z.object({
  id: z
    .string({ message: "l'identifiant est obligatoire" })
    .trim()
    .min(1, "identifiant invalide")
    .max(50, "identifiant invalide"),
});


const champsModifiables = {
  nature: true,
  quartier: true,
  prix: true,
  frequence: true,
  duree: true,
  caution: true,
  nombreChambre: true,
  nombreDouche: true,
  equipements: true,
  securite: true,
};

const updateAlerteSchema = createAlerteSchema
  .pick(champsModifiables)
  .partial()   
  .strict() 
  .refine((d) => Object.keys(d).length > 0, {
    message: "aucun champ à modifier",
  });

module.exports = {
  createAlerteSchema,
  getAlertesSchema,
  getAlerteSchema,
  updateAlerteSchema,
  deleteAlerteSchema,
  validate,
};
