const { z } = require("zod");

const numeric = (min = 0) => z.number({ error: "number" }).int({ error: "integer" }).min(min, { error: "minimum" }).max(1e12, { error: "maximum" });
const creationFields = z.object({
  type: z.enum(["appartement", "villa", "duplex", "studio", "chambre"], { error: "choice" }).optional(),
  nature: z.enum(["moderne", "simple", "meubler"], { error: "choice" }).optional(),
  natureAnnonce: z.enum(["vente", "location"], { error: "choice" }).optional(),
  ville: z.string({ error: "required" }).trim().min(3, { error: "location" }).max(120, { error: "location" }).toLowerCase(),
  quartier: z.string({ error: "text" }).trim().max(120, { error: "location" }).toLowerCase().optional(),
  prix: numeric(1000).optional(), prixMin: numeric().optional(), prixMax: numeric(1000).optional(),
  frequence: z.enum(["jour", "semaine", "mois", "annee"], { error: "choice" }).optional(),
  duree: numeric(1).optional(), caution: numeric().optional(),
  nombreChambre: numeric().optional(), nombreDouche: numeric().optional(),
  equipements: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  securite: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
}).strict();
const createAlerteSchema = creationFields.superRefine((data, ctx) => {
  if (data.prixMin != null && data.prixMax != null && data.prixMin > data.prixMax)
    ctx.addIssue({ code: "custom", path: ["prixMin"], message: "range" });
  if (data.natureAnnonce === "vente") {
    for (const field of ["frequence", "duree", "caution"]) if (data[field] != null)
      ctx.addIssue({ code: "custom", path: [field], message: "sale" });
  }
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
  id: z.string({ message: "l'identifiant est obligatoire" }).trim().min(1, "identifiant invalide").max(50, "identifiant invalide").refine((id) => !id.includes("/") && id !== "." && id !== "..", "identifiant invalide"),
});

// source = "body" (défaut), "query" ou "params"
const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: req.t("errors:alerte.invalid"),
      errors: Object.fromEntries(result.error.issues.map((issue) => [
        issue.path.join(".") || "form", req.t(`errors:alerte.validation.${["number", "integer", "minimum", "maximum", "choice", "required", "location", "text", "range", "sale"].includes(issue.message) ? issue.message : "invalid"}`),
      ])),
      errorCodes: Object.fromEntries(result.error.issues.map(issue => [issue.path.join(".") || "form", issue.code])),
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
    .max(50, "identifiant invalide").refine((id) => !id.includes("/") && id !== "." && id !== "..", "identifiant invalide"),
});


module.exports = {
  createAlerteSchema,
  getAlertesSchema,
  getAlerteSchema,
  deleteAlerteSchema,
  validate,
};
