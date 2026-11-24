const { candidatureActions } = require('../../utils/candidatureActions');
const AppError = require('../../errors/AppError');
const { calculerNoteCandidature, appointmentDate } = require('../../utils/candidatureScore');
const { createId } = require("@paralleldrive/cuid2");

const candidatureRepository = require("../../repositories/candidature.repository");
const { Candidature } = require("../../models/candidature");
const { susprendreCompte } = require("../suspensionCompte");
const { createNotification } = require("../notification.service");
const { findByPublicId } = require('../../repositories/locataire.repository');

/**
 * Vérifie si le type de forfait est connu.
 *
 * @param {Object} user
 * @returns {boolean}
 */
function hasValidForfait(user) {
  return [
    "mensuel",
    "trimestriel",
    "annuel",
    "aucun",
  ].includes(user?.forfait?.type);
}

/**
 * Vérifie si le forfait payant est encore actif.
 *
 * @param {Object} user
 * @returns {boolean}
 */
function hasActiveForfait(user) {
  if (
    ![
      "mensuel",
      "trimestriel",
      "annuel",
    ].includes(user?.forfait?.type)
  ) {
    return false;
  }

  const value = user?.forfait?.fin;
  const fin = value?.toMillis?.() ?? ((value?.seconds ?? value?._seconds) != null ? (value.seconds ?? value._seconds) * 1000 : +new Date(value));
  return Number.isFinite(fin) && Date.now() < fin;
}

/**
 * Crée une candidature.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @param {Object} params.user
 * @param {string} [params.role]
 * @param {Function} params.t
 * @returns {Promise<Object>}
 */
async function createCandidature({
  data,
  user,
  role,
  t,
}) {
  if (!hasValidForfait(user)) {
    await susprendreCompte(
      user.id,
      role ?? "locataire",
      {
        "forfait.type": "aucun",
      }
    );

    const error = new Error( "errors:backend.suspended");

    error.statusCode = 203;
    throw error;
  }

  const annonce = await candidatureRepository.findAnnonceByPublicId(
      data.annonceId
    );

  if (!annonce || annonce.status !== "publier" || annonce.estPubliee === false) {
    const error = new Error(
      t("not_found", {
        ns: "errors",
      })
    );

    error.statusCode = 400;
    throw error;
  }
  const locataireId = user.idPublic;
  const bailleurId = annonce.bailleurId;

  const idPublic = createId();
  const bien = await candidatureRepository.findBienByPublicId(annonce.bienId);
  if (data.type === 'visite' && (!appointmentDate(data.visite) || +appointmentDate(data.visite) <= Date.now()))
    throw new AppError('errors:backend.futureAppointment', 400);

  console.log(bien)
  const candidature =
    new Candidature({
      idPublic,
      note: calculerNoteCandidature(user, annonce, bien || {}),
      bailleurId,
      locataireId,
      type: data.type,
      message: data.message,
      visite: data.visite,
      demande: data.demande,
      annonceId: data.annonceId,
    }).toFirebase();

    console.log(candidature)
  await candidatureRepository.createAtomic(candidature, { userId: user.id });

  const dataR = {...candidature, locataire : await findByPublicId(locataireId)}

  await createNotification({
    destinataireId: bailleurId,
    typeDestinataire: "bailleur",
    type: "candidature",
    cibleId: idPublic,
    typeCible: "candidature",
    titreKey: data.type === 'visite' ? 'backend.push.visitTitle' : 'backend.push.applicationTitle',
    messageKey: 'backend.push.applicationBody', values: { titre: annonce.titre },
  });

  return {
    candidature: dataR,
    forfait: false,
  };
}

/**
 * Accepte une candidature.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function acceptCandidature({
  idPublic,
  bailleurId,
  user,
  t,
}) {
  const candidature =
    await candidatureRepository.findPendingByIdAndBailleur({
      idPublic,
      bailleurId,
    });

  if (!candidature) {
    const error = new Error(
      "errors:backend.notFound"
    );

    error.statusCode = 404;
    throw error;
  }

  const statut =
    candidature.type === "demande"
      ? "dossierRetenu"
      : "visitePrevue";

  const updated = await candidatureRepository.updateByDocumentId(
    candidature.documentId,
    {
      updatedAt: new Date(),
      statut,
    }
  );

  updated.locataire = await findByPublicId(updated.locataireId)
  await createNotification({
    destinataireId: candidature.locataireId,
    typeDestinataire: "locataire",
    type: "candidature",
    cibleId: idPublic,
    typeCible: "candidature",
    titreKey: "notification.application_accepted.title",
    messageKey: "notification.application_accepted.message", values: { user: [user?.prenom, user?.nom].filter(Boolean).join(" ") },
  });
  return updated;
}

/**
 * Refuse une candidature.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function refuseCandidature({
  idPublic,
  bailleurId,
  user,
  t,
}) {
  const candidature =
    await candidatureRepository.findPendingByIdAndBailleur({
      idPublic,
      bailleurId,
    });

  if (!candidature) {
    const error = new Error(
      "errors:backend.notFound"
    );

    error.statusCode = 404;
    throw error;
  }

  const updated = await candidatureRepository.updateByDocumentId(
    candidature.documentId,
    {
      updatedAt: new Date(),
      statut: "refuser",
    }
  );

  updated.locataire = await findByPublicId(updated.locataireId)
  await createNotification({
    destinataireId: candidature.locataireId,
    typeDestinataire: "locataire",
    type: "candidature",
    cibleId: idPublic,
    typeCible: "candidature",
    titreKey: "notification.application_rejected.title",
    messageKey: "notification.application_rejected.message", values: { user: [user?.prenom, user?.nom].filter(Boolean).join(" ") },
  });
  return updated;
}

/**
 * Annule une candidature.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function cancelCandidature({
  idPublic,
  userId,
  user,
  t,
}) {
  const candidature =
    await candidatureRepository.findActiveByIdAndUser({
      idPublic,
      userId,
    });

  if (!candidature) {
    const error = new Error(
      "errors:backend.notFound"
    );

    error.statusCode = 404;
    throw error;
  }

  const updated = await candidatureRepository.updateByDocumentId(
    candidature.documentId,
    {
      updatedAt: new Date(),
      statut: "annuler",
    }
  );

  updated.locataire = await findByPublicId(updated.locataireId)
  const isCandidate = candidature.locataireId === userId;
  const cancellationKey = isCandidate
    ? "notification.application_cancelled_by_candidate"
    : "notification.application_cancelled_by_owner";
  await createNotification({
    destinataireId: isCandidate ? candidature.bailleurId : candidature.locataireId,
    typeDestinataire: isCandidate ? "bailleur" : "locataire",
    type: "candidature",
    cibleId: idPublic,
    typeCible: "candidature",
    titreKey: `${cancellationKey}.title`,
    messageKey: `${cancellationKey}.message`, values: { user: [user?.prenom, user?.nom].filter(Boolean).join(" ") },
  });
  return updated;
}

/**
 * Programme une visite.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function programmerCandidature({
  idPublic,
  bailleurId,
  date,
  time,
  t,
}) {
  const candidature =
    await candidatureRepository.findVisiteByIdAndBailleur({
      idPublic,
      bailleurId,
    });

  if (!candidature) {
    const error = new Error(
      "errors:backend.notFound"
    );

    error.statusCode = 404;
    throw error;
  }

  if (!appointmentDate({ dateSouhaitee: date, heureSouhaitee: time }) ||
      +appointmentDate({ dateSouhaitee: date, heureSouhaitee: time }) <= Date.now())
    throw new AppError('errors:backend.futureAppointment', 400);
  const updated = await candidatureRepository.updateByDocumentId(
    candidature.documentId,
    {
      updatedAt: new Date(),
      honoree: { bailleur: null, locataire: null },
      statut: "visitePrevue",
      "visite.dateSouhaitee": date,
      "visite.heureSouhaitee": time,
    }
  );

  updated.locataire = await findByPublicId(updated.locataireId)
  await createNotification({
    destinataireId: candidature.locataireId,
    typeDestinataire: "locataire",
    type: "candidature",
    cibleId: idPublic,
    typeCible: "candidature",
    titreKey: "notification.visit_scheduled.title",
    messageKey: "notification.visit_scheduled.message",
  });
  return updated;
}

/**
 * Modifie une candidature.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function updateCandidature({
  idPublic,
  data,
  locataireId,
  user,
  role,
  t,
}) {
  const candidature =
    await candidatureRepository.findPendingByIdAndLocataire({
      idPublic,
      locataireId,
    });

  if (!candidature) {
    const error = new Error(
      "errors:backend.notFound"
    );

    error.statusCode = 404;
    throw error;
  }

  const patch = { updatedAt: new Date() };
  if (data.demande !== undefined) patch.demande = { ...candidature.demande, ...data.demande };
  if (data.visite !== undefined) {
    patch.visite = { ...candidature.visite, ...data.visite };
    const date = require('../../utils/candidatureScore').appointmentDate(patch.visite);
    if (!date || +date <= Date.now()) throw new AppError('errors:backend.futureAppointment', 400);
  }
  let updated = await candidatureRepository.updateByDocumentId(candidature.documentId, patch);

  updated.locataire = await findByPublicId(locataireId)


  await createNotification({
    destinataireId:
      role === "bailleur"
        ? candidature.locataireId
        : candidature.bailleurId,

    typeDestinataire:
      role === "bailleur"
        ? "locataire"
        : "bailleur",

    type: "candidature",
    cibleId: idPublic,
    typeCible: "candidature",

    messageKey: 'notification.application_updated.message',
    titreKey: 'notification.application_updated.title',
    values: { user: [user?.prenom, user?.nom].filter(Boolean).join(' ') },

    lang: user?.language,
  });

  return updated;
}

/**
 * Supprime logiquement une candidature.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function deleteCandidature({
  idPublic,
  userId,
}) {
  const candidature =
    await candidatureRepository.findByIdAndUser({
      idPublic,
      userId,
    });

  if (!candidature) {
    const error = new Error(
      "errors:backend.notFound"
    );

    error.statusCode = 404;
    throw error;
  }

  return candidatureRepository.updateByDocumentId(
    candidature.documentId,
    {
      [`delete.${userId}`]: true,
      statut: "annuler",
    }
  );
}

/**
 * Récupère une candidature et ses relations.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function getCandidature({
  idPublic,
  user,
  role,
}) {
  const candidature =
    await candidatureRepository.findByIdAndUser({
      idPublic,
      userId: user.idPublic,
    });

  if (!candidature) {
    const error = new Error( "errors:backend.notFound" );

    error.statusCode = 404;
    throw error;
  }

  if (role === 'bailleur') {
    await candidatureRepository.markRead({ idPublic, userId: user.idPublic });
    candidature.vu = true;
  }

  const annonce =
    await candidatureRepository.findAnnonceByPublicId(
      candidature.annonceId
    );

  let bien = null;

  if (annonce?.bienId) {
    bien =
      await candidatureRepository.findBienByPublicId(
        annonce.bienId
      );
  }

  const locataire = await findByPublicId(candidature.locataireId)

  return {
    ...candidature,
    actions: candidatureActions(candidature, role),
    bailleur: await require("../../repositories/bailleur.repository").findByPublicId(candidature.bailleurId).then(owner => owner ? { idPublic: owner.idPublic, nom: owner.nom, prenom: owner.prenom, photoProfil: owner.photoProfil, telephone: owner.telephone, typeProfil: owner.typeProfil } : null),
    bien,
    locataire,
    annonce: annonce
      ? {
          ...annonce,
          bien,
        }
      : {
          existe: false,
        },
  };
}

/**
 * Récupère la liste des candidatures.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function getCandidatures({
  filters,
  user,
  role,
}) {
  const result = await candidatureRepository.list({
    filters,
    userId: user.idPublic,
    role,
  });
  const relationRepository = require("../../repositories/favori.repository");
  const annonces = await relationRepository.findAnnoncesByPublicIds(result.candidatures.map(c => c.annonceId).filter(Boolean));
  const biens = await relationRepository.findBiensByPublicIds(annonces.map(a => a.bienId).filter(Boolean));
  const byAnnonce = new Map(annonces.map(a => [a.idPublic, a]));
  const byBien = new Map(biens.map(b => [b.idPublic, b]));
  return { ...result, candidatures: await Promise.all(result.candidatures.map(async (c) => {
    const annonce = byAnnonce.get(c.annonceId);
    const locataire = await findByPublicId(c.locataireId)
    return { ...c, locataire, annonce: annonce ?? { existe: false }, bien: byBien.get(annonce?.bienId) ?? null };
  })) };
}

async function markRead({ idPublic, user }) {
  return candidatureRepository.markRead({ idPublic, userId: user.idPublic });
}
async function setAttendance({ idPublic, user, role, data }) {
  return candidatureRepository.setAttendance({ idPublic, userId: user.idPublic, role, ...data });
}
async function getCandidateProfile({ idPublic, user }) {
  const candidature = await candidatureRepository.findByIdAndUser({ idPublic, userId: user.idPublic });
  if (!candidature || candidature.bailleurId !== user.idPublic) throw new AppError('errors:backend.notFound', 404);
  return candidatureRepository.candidateProfile(candidature.locataireId);
}
module.exports = {
  markRead, setAttendance, getCandidateProfile,
  createCandidature,
  acceptCandidature,
  refuseCandidature,
  cancelCandidature,
  programmerCandidature,
  updateCandidature,
  deleteCandidature,
  getCandidature,
  getCandidatures,
};
