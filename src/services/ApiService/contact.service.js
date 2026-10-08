const { createId } = require("@paralleldrive/cuid2");

const { Contact } = require("../../models/contact");
const contactRepository = require("../../repositories/contact.repository");
const {
  sendContactEmail,
  sendContactReplyEmail,
} = require("../contactMail.service");

/**
 * Crée une erreur métier avec un code HTTP.
 *
 * @param {string} message
 * @param {number} statusCode
 * @throws {Error}
 */
const createBusinessError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  throw error;
};

/**
 * Crée un nouveau contact.
 *
 * @param {Object} params
 * @param {Object} params.data
 * @returns {Promise<Object>}
 */
const createContact = async ({ data }) => {
  const idPublic = createId();

  const contact = new Contact({
    ...data,
    idPublic,
  });

  const result = await contactRepository.create(
    contact.toFirebase()
  );

  /**
   * L'enregistrement du contact est indépendant
   * de l'envoi de l'email de notification.
   */
  const emailResult = await sendContactEmail({
    nom: data.nom,
    email: data.email,
    sujet: data.sujet,
    message: data.message,
  });

  return {
    contact: result.contact,
    emailSent: emailResult?.success === true,
  };
};

/**
 * Récupère les contacts.
 *
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {string} [params.statut]
 * @param {string} [params.recherche]
 * @returns {Promise<Object>}
 */
const getContacts = async ({
  page,
  limit,
  statut,
  recherche,
}) => {
  return contactRepository.list({
    page,
    limit,
    statut,
    recherche,
  });
};

/**
 * Modifie le statut d'un contact.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {string} params.statut
 * @returns {Promise<Object>}
 */
const updateContactStatus = async ({ id, statut }) => {
  const result = await contactRepository.findByPublicId(id);

  if (!result) {
    createBusinessError(
      "Le contact n'existe pas.",
      404
    );
  }

  await contactRepository.updateStatus({
    documentId: result.documentId,
    statut,
  });

  return {
    ...result.contact,
    statut,
  };
};

/**
 * Répond à un contact par email.
 *
 * L'adresse email est récupérée depuis Firestore.
 * Le client n'a donc pas la possibilité de modifier
 * le destinataire de la réponse.
 *
 * @param {Object} params
 * @param {string} params.id
 * @param {string} params.sujet
 * @param {string} params.message
 * @returns {Promise<Object>}
 */
const replyToContact = async ({
  id,
  sujet,
  message,
}) => {
  const result = await contactRepository.findByPublicId(id);

  if (!result) {
    createBusinessError(
      "Le contact n'existe pas.",
      404
    );
  }

  const { contact } = result;

  if (!contact.email) {
    createBusinessError(
      "Ce contact ne possède pas d'adresse email.",
      400
    );
  }

  const emailResult = await sendContactReplyEmail({
    email: contact.email,
    sujet,
    message,
  });

  if (!emailResult?.success) {
    createBusinessError(
      "Impossible d'envoyer la réponse.",
      500
    );
  }

  /**
   * Une réponse envoyée signifie que le contact
   * est désormais traité.
   */
  await contactRepository.updateStatus({
    documentId: result.documentId,
    statut: "traite",
  });

  return {
    contact: {
      ...contact,
      statut: "traite",
    },
    email: contact.email,
    sujet,
    message,
  };
};

module.exports = {
  createContact,
  getContacts,
  updateContactStatus,
  replyToContact,
};