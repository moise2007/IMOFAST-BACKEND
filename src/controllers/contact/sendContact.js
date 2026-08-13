const { sendContactEmail } = require("../../services/contactMail.service");

async function sendContact(req, res) {
  try {
    const { nom, email, sujet, message } = req.body;

    await sendContactEmail({ nom, email, sujet, message });

    return res.status(200).json({
      success: true,
      msg: "Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.",
    });
  } catch (err) {
    console.error("[Contact] Erreur envoi:", err.message);

    const isConfigError = err.message?.includes("MAIL_USER");
    const isDev = process.env.NODE_ENV !== "production";

    return res.status(500).json({
      success: false,
      msg: isConfigError
        ? "Service email non configuré sur le serveur. Contactez l'administrateur."
        : isDev
          ? `Erreur envoi email : ${err.message}`
          : "Impossible d'envoyer votre message pour le moment. Veuillez réessayer plus tard.",
    });
  }
}

module.exports = { sendContact };
