const { asyncHandler } = require("../utils/asyncHandler");
const contactService = require("../services/ApiService/contact.service");

/**
 * Crée un nouveau contact.
 */
const createContact = asyncHandler(async (req, res) => {
  const result = await contactService.createContact({
    data: req.validatedBody,
  });

  return res.status(200).json({
    success: true,
    msg: "Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.",
    contact: result.contact,
  });
});

/**
 * Récupère la liste des contacts.
 */
const getContacts = asyncHandler(async (req, res) => {
  const result = await contactService.getContacts(
    req.validatedQuery
  );

  return res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * Modifie le statut d'un contact.
 */
const updateContactStatus = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;
  const { statut } = req.validatedBody;

  const contact = await contactService.updateContactStatus({
    id,
    statut,
  });

  return res.status(200).json({
    success: true,
    message: "Le statut du contact a été mis à jour.",
    contact,
  });
});

/**
 * Répond à un contact par email.
 */
const replyToContact = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;
  const { sujet, message } = req.validatedBody;

  const result = await contactService.replyToContact({
    id,
    sujet,
    message,
  });

  return res.status(200).json({
    success: true,
    message: "La réponse a été envoyée avec succès.",
    contact: result.contact,
  });
});

module.exports = {
  createContact,
  getContacts,
  updateContactStatus,
  replyToContact,
};