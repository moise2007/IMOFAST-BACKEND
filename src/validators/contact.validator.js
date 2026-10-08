const { z } = require("zod");

/**
 * Statuts possibles d'un contact.
 */
const CONTACT_STATUS = ["nouveau", "lu", "traite"];

/**
 * Validation de la création d'un contact.
 */
const createContactSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(80, "Le nom ne peut pas dépasser 80 caractères."),

  email: z
    .string()
    .trim()
    .email("L'adresse email est invalide.")
    .max(150, "L'adresse email ne peut pas dépasser 150 caractères.")
    .transform((value) => value.toLowerCase()),

  sujet: z
    .string()
    .trim()
    .min(3, "Le sujet doit contenir au moins 3 caractères.")
    .max(120, "Le sujet ne peut pas dépasser 120 caractères."),

  message: z
    .string()
    .trim()
    .min(10, "Le message doit contenir au moins 10 caractères.")
    .max(2000, "Le message ne peut pas dépasser 2000 caractères."),
});

/**
 * Validation des paramètres permettant d'identifier un contact.
 */
const contactIdSchema = z.object({
  id: z.string().trim().min(1, "L'identifiant du contact est requis."),
});

/**
 * Validation de la récupération des contacts.
 */
const getContactsSchema = z.object({
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
    .default(20),

  statut: z
    .enum(CONTACT_STATUS)
    .optional(),

  recherche: z
    .string()
    .trim()
    .optional(),
});

/**
 * Validation de la modification du statut d'un contact.
 */
const updateContactStatusSchema = z.object({
  statut: z.enum(CONTACT_STATUS),
});

/**
 * Validation de la réponse envoyée par un administrateur.
 *
 * L'adresse email n'est volontairement pas présente ici.
 * Elle est récupérée depuis le contact enregistré en base.
 */
const replyContactSchema = z.object({
  sujet: z
    .string()
    .trim()
    .min(3, "Le sujet doit contenir au moins 3 caractères.")
    .max(120, "Le sujet ne peut pas dépasser 120 caractères."),

  message: z
    .string()
    .trim()
    .min(1, "Le message est requis.")
    .max(5000, "Le message ne peut pas dépasser 5000 caractères."),
});

/**
 * Middleware générique de validation Zod.
 *
 * @param {import("zod").ZodSchema} schema
 * @param {"body"|"params"|"query"} source
 * @returns {Function}
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
        break;
    }

    next();
  };
};

module.exports = {
  CONTACT_STATUS,
  createContactSchema,
  contactIdSchema,
  getContactsSchema,
  updateContactStatusSchema,
  replyContactSchema,
  validate,
};