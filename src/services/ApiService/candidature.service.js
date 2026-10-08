const { createId } = require("@paralleldrive/cuid2");

const candidatureRepository = require("../../repositories/candidature.repository");
const { Candidature } = require("../../models/candidature");
const { susprendreCompte } = require("../suspensionCompte");
const { createNotification } = require("../notification.service");

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

  const fin = user?.forfait?.fin?._seconds;

  if (!fin) {
    return false;
  }

  return Date.now() <= fin * 1000;
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

    const error = new Error(
      "Votre compte a été suspendu pour 7 jours car nous avons repéré une activité inhabituelle."
    );

    error.statusCode = 203;

    throw error;
  }

  const annonce =
    await candidatureRepository.findAnnonceByPublicId(
      data.annonceId
    );

  if (!annonce) {
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

  const candidatureExistante =
    await candidatureRepository.findPendingByAnnonceAndLocataire({
      annonceId: data.annonceId,
      locataireId,
    });

  if (candidatureExistante) {
    await candidatureRepository.updateByDocumentId(
      candidatureExistante.documentId,
      {
        updatedAt: new Date(),
        statut: "annuler",
      }
    );
  }

  const forfaitActif = hasActiveForfait(user);

  const candidaturesRestantes =
    user?.candidatures?.candidaturesRestantes;

  const peutPostuler =
    forfaitActif ||
    (
      user?.forfait?.type === "aucun" &&
      candidaturesRestantes != null &&
      candidaturesRestantes > 0
    );

  if (!peutPostuler) {
    return {
      candidature: null,
      forfait: true,
      msg: "Veuillez souscrire à un forfait pour pouvoir faire des candidatures.",
    };
  }

  const idPublic = createId();

  const candidature =
    new Candidature({
      idPublic,
      bailleurId,
      locataireId,
      type: data.type,
      message: data.message,
      visite: data.visite,
      demande: data.demande,
      annonceId: data.annonceId,
    }).toFirebase();

  await candidatureRepository.create(candidature);

  await candidatureRepository.incrementAnnonceCandidatures(
    data.annonceId
  );

  if (!forfaitActif) {
    await candidatureRepository.decrementLocataireCandidatures(
      user.id
    );
  }

  return {
    candidature,
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
}) {
  const candidature =
    await candidatureRepository.findPendingByIdAndBailleur({
      idPublic,
      bailleurId,
    });

  if (!candidature) {
    const error = new Error(
      "Candidature introuvable."
    );

    error.statusCode = 404;
    throw error;
  }

  const statut =
    candidature.type === "demande"
      ? "dossierRetenu"
      : "visitePrevue";

  return candidatureRepository.updateByDocumentId(
    candidature.documentId,
    {
      updatedAt: new Date(),
      statut,
    }
  );
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
}) {
  const candidature =
    await candidatureRepository.findPendingByIdAndBailleur({
      idPublic,
      bailleurId,
    });

  if (!candidature) {
    const error = new Error(
      "Candidature introuvable."
    );

    error.statusCode = 404;
    throw error;
  }

  return candidatureRepository.updateByDocumentId(
    candidature.documentId,
    {
      updatedAt: new Date(),
      statut: "refuser",
    }
  );
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
}) {
  const candidature =
    await candidatureRepository.findActiveByIdAndUser({
      idPublic,
      userId,
    });

  if (!candidature) {
    const error = new Error(
      "Candidature introuvable."
    );

    error.statusCode = 404;
    throw error;
  }

  return candidatureRepository.updateByDocumentId(
    candidature.documentId,
    {
      updatedAt: new Date(),
      statut: "annuler",
    }
  );
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
}) {
  const candidature =
    await candidatureRepository.findVisiteByIdAndBailleur({
      idPublic,
      bailleurId,
    });

  if (!candidature) {
    const error = new Error(
      "Candidature introuvable."
    );

    error.statusCode = 404;
    throw error;
  }

  return candidatureRepository.updateByDocumentId(
    candidature.documentId,
    {
      updatedAt: new Date(),
      statut: "visitePrevue",
      "visite.dateSouhaitee": date,
      "visite.heureSouhaitee": time,
    }
  );
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
      "Candidature introuvable."
    );

    error.statusCode = 404;
    throw error;
  }

  const updated =
    await candidatureRepository.updateByDocumentId(
      candidature.documentId,
      {
        updatedAt: new Date(),
        demande: data.demande,
        visite: data.visite,
      }
    );

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

    message: t(
      "notification.application_updated.message",
      {
        ns: "responses",
        user: `${user?.prenom} ${user?.nom}`,
      }
    ),

    titre: t(
      "notification.application_updated.title",
      {
        ns: "responses",
      }
    ),

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
      "Candidature introuvable."
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
    const error = new Error(
      "Candidature introuvable."
    );

    error.statusCode = 404;
    throw error;
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

  return {
    ...candidature,
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
  return candidatureRepository.list({
    filters,
    userId: user.idPublic,
    role,
  });
}

module.exports = {
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