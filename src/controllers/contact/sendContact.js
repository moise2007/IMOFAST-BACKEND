const { sendContactEmail } = require("../../services/contactMail.service");

async function sendContact(req, res) {
  try {
    const { nom, email, sujet, message } = req.body;

    const resp = await sendContactEmail({ nom, email, sujet, message });

    return res.status(200).json({
      success: resp.success,
      msg: resp.success ? "Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais." : resp.msg,
    });
  } catch (err) {
    console.error("[Contact] Erreur envoi:", err.message);


    return res.status(500).json({
      success: false,
      msg:  "Impossible d'envoyer votre message pour le moment. Veuillez réessayer plus tard.",
    });
  }
}

module.exports = { sendContact };
