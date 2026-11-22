const { createId } = require("@paralleldrive/cuid2");
const AppError = require("../../errors/AppError");
const alerteRepository = require("../../repositories/alerte.repository");
const { recordAlerteViewer } = require("../metrics/consultation.service");
const { notifyOwnersForAlert } = require("../../notifications/alertDelivery");

exports.createAlerte = async ({ data, user, role }) => {
  if (!["locataire", "admin"].includes(role)) throw new AppError("errors:alerte.forbidden", 403);
  const alerte = await alerteRepository.create({ ...data, idPublic: createId(), auteurId: user.idPublic, role,
    actif: true, nombreBailleursVus: 0 });
  if (role === "locataire") await notifyOwnersForAlert(alerte).catch((error) => console.error("Notification nouvelle alerte :", error));
  return alerte;
};

exports.getAlertes = async ({ filters, user, role }) => {
  if (!["locataire", "bailleur", "admin"].includes(role)) {
    throw new AppError("errors:alerte.forbidden", 403);
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
  if (role === "bailleur") await require("./onboarding.service").markAlertsSeen(user);

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
  if (!["locataire", "bailleur", "admin"].includes(role)) {
    throw new AppError("errors:alerte.forbidden", 403);
  }

  const alerte = await alerteRepository.findByIdPublic(id);
  if (!alerte) {
    throw new AppError("errors:alerte.notFound", 404);
  }

  // Un locataire ne peut voir que ses propres alertes, un bailleur les voit toutes
  if (role === "locataire" && alerte.auteurId !== user.idPublic) {
    // 404 plutôt que 403 pour ne pas révéler l'existence de l'alerte
    throw new AppError("errors:alerte.notFound", 404);
  }

  if (role === "bailleur" && alerte.role === "locataire") {
    alerte.nombreBailleursVus = await recordAlerteViewer(id, user.idPublic);
    alerte.locataire = await alerteRepository.findLocataireSummaryByPublicId(alerte.auteurId);
  }

  return { ...alerte, actif: alerte.actif !== false, nombreBailleursVus: alerte.nombreBailleursVus ?? 0 };
};

exports.deleteAlerte = async ({ id, user, role }) => {
  if (!["locataire", "admin"].includes(role)) {
    throw new AppError("errors:alerte.forbidden", 403);
  }
  const alerte = await alerteRepository.findByIdPublic(id);
  if (!alerte || (role === "locataire" && alerte.auteurId !== user.idPublic)) {
    throw new AppError("errors:alerte.notFound", 404);
  }
  await alerteRepository.remove(id);
};

exports.respondToAlert = async ({ id, user, role }) => {
  if (role !== 'bailleur') throw new AppError('errors:backend.forbidden', 403);
  const alert = await alerteRepository.findByIdPublic(id);
  if (!alert || alert.role !== 'locataire' || alert.actif === false) throw new AppError('errors:backend.notFound', 404);
  const tenant = await require('../../repositories/locataire.repository').findByPublicId(alert.auteurId);
  if (!tenant || tenant.status !== 'actif') throw new AppError('errors:backend.notFound', 404);
  const conversation = await require('./conversation.service').createConversation({ userId: user.idPublic, role, otherUserId: alert.auteurId });
  const t = require('../../config/i18n.config').getFixedT(tenant.langue || 'fr', 'responses');
  const characteristics = [alert.type ? t(`backend.propertyTypes.${alert.type}`, { defaultValue: alert.type }) : null,
    alert.nature ? t(`backend.propertyTypes.${alert.nature}`, { defaultValue: alert.nature }) : null,
    alert.ville, alert.quartier, alert.prixMax || alert.prix ? t('backend.alertBudget', { prix: alert.prixMax || alert.prix }) : null].filter(Boolean).join(', ');
  const messageId = 'alerte_' + require('node:crypto').createHash('sha256').update(`${id}:${user.idPublic}`).digest('hex');
  const message = await require('./message.service').sendMessage({ conversationId: conversation.idPublic,
    auteurId: user.idPublic, auteur: user, messageId,
    data: { type: 'texte', contenu: t('backend.alertReply', { caracteristiques: characteristics }) } });
  return { conversation, message };
};
