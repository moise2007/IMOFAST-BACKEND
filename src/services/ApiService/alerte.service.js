const { createId } = require("@paralleldrive/cuid2");
const AppError = require("../../errors/AppError");
const alerteRepository = require("../../repositories/alerte.repository");
const { susprendreCompte } = require("../suspensionCompte");

const FORFAITS_VALIDES = ["mensuel", "trimestriel", "annuel", "aucun"];


const forfaitEstActif = (forfait) => {
  if (!forfait || forfait.type === "aucun") return false;
  const fin = forfait.fin?._seconds;
  return !!fin && Date.now() < fin * 1000;
};

exports.createAlerte = async ({ data, user, role }) => {
  // 1. Type de forfait falsifié => suspension
  if (!FORFAITS_VALIDES.includes(user.forfait?.type)) {
    await susprendreCompte(user.id, role ?? "locataire", { "forfait.type": "aucun" });
    throw new AppError(
      "votre compte a été suspendu pour 7 jours car nous avons repéré une activité inhabituelle",
      403
    );
  }

  // 2. Forfait actif ou quota gratuit restant
  const actif = forfaitEstActif(user.forfait);
  const restant = user.nombreAlertesRestants ?? 0;

  if (!actif && restant <= 0) {
    throw new AppError(
      "veuillez souscrire à un forfait pour pouvoir faire des alertes aux bailleurs.",
      402,
      { forfait: true }
    );
  }

  // 3. Construction de l'alerte
  const alerte = {
    idPublic: createId(),
    ...data,
    auteurId: user.idPublic,
    role,
  };

  // 4. Persistance (on décrémente le quota seulement si pas de forfait actif)
  return alerteRepository.create(alerte, {
    decrementQuotaOf: actif ? null : user.id,
  });
};


exports.getAlertes = async ({ filters, user, role }) => {
  if (!["locataire", "bailleur"].includes(role)) {
    throw new AppError("accès refusé", 403);
  }

  const { page, limit, ...criteres } = filters;

  // Un locataire ne voit que ses alertes, un bailleur les voit toutes
  const scope = role === "locataire" ? { auteurId: user.idPublic } : {};
  const criteresFinaux = { ...criteres, ...scope };

  // Données et total en parallèle
  const [docs, totalItems] = await Promise.all([
    alerteRepository.findMany({ criteres: criteresFinaux, page, limit }),
    alerteRepository.countMany(criteresFinaux),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    alertes: docs.map((d) => d.data()),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

exports.getAlerte = async ({ id, user, role }) => {
  if (!["locataire", "bailleur"].includes(role)) {
    throw new AppError("accès refusé", 403);
  }

  const alerte = await alerteRepository.findByIdPublic(id);
  if (!alerte) {
    throw new AppError("alerte introuvable", 404);
  }

  // Un locataire ne peut voir que ses propres alertes, un bailleur les voit toutes
  if (role === "locataire" && alerte.auteurId !== user.idPublic) {
    // 404 plutôt que 403 pour ne pas révéler l'existence de l'alerte
    throw new AppError("alerte introuvable", 404);
  }

  if (role === "bailleur" && alerte.role === "locataire") {
    alerte.locataire = await alerteRepository.findLocataireSummaryByPublicId(alerte.auteurId);
  }

  return alerte;
};

exports.updateAlerte = async ({ id, data, user, role }) => {
  const alerte = await alerteRepository.findByIdPublic(id);
  if (!alerte) {
    throw new AppError("alerte introuvable", 404);
  }

  // Un locataire ne modifie que ses propres alertes (l'admin peut tout modifier)
  if (role === "locataire" && alerte.auteurId !== user.idPublic) {
    throw new AppError("alerte introuvable", 404);
  }
  if (!["locataire", "admin"].includes(role)) {
    throw new AppError("accès refusé", 403);
  }

  return alerteRepository.update(id, data);
};

exports.deleteAlerte = async ({ id, user, role }) => {
  if (!["locataire", "admin"].includes(role)) {
    throw new AppError("accès refusé", 403);
  }
  const alerte = await alerteRepository.findByIdPublic(id);
  if (!alerte || (role === "locataire" && alerte.auteurId !== user.idPublic)) {
    throw new AppError("alerte introuvable", 404);
  }
  await alerteRepository.remove(id);
};
