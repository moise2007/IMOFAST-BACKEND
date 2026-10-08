const { resend } = require("../config/mail.config");

/**
 * Échappe les caractères HTML dangereux.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Construit le HTML de l'email reçu depuis le formulaire de contact.
 *
 * @param {Object} params
 * @param {string} params.nom
 * @param {string} params.email
 * @param {string} params.sujet
 * @param {string} params.message
 * @returns {string}
 */
function buildContactEmailHtml({
  nom,
  email,
  sujet,
  message,
}) {
  const safeNom = escapeHtml(nom);
  const safeEmail = escapeHtml(email);
  const safeSujet = escapeHtml(sujet);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table
          width="600"
          cellpadding="0"
          cellspacing="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);"
        >
          <tr>
            <td
              style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:28px 32px;text-align:center;"
            >
              <h1
                style="margin:0;color:#ffffff;font-size:24px;font-weight:700;"
              >
                Imo<span style="color:#dbeafe;">Fast</span>
              </h1>

              <p
                style="margin:8px 0 0;color:#dbeafe;font-size:14px;"
              >
                Nouveau message depuis le formulaire de contact
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;"
              >
                <tr>
                  <td
                    style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;text-transform:uppercase;"
                  >
                    Nom complet
                  </td>
                </tr>

                <tr>
                  <td
                    style="padding:14px 16px;font-size:15px;color:#0f172a;font-weight:600;"
                  >
                    ${safeNom}
                  </td>
                </tr>

                <tr>
                  <td
                    style="padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;text-transform:uppercase;"
                  >
                    E-mail
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 16px;font-size:15px;">
                    <a
                      href="mailto:${safeEmail}"
                      style="color:#2563eb;text-decoration:none;"
                    >
                      ${safeEmail}
                    </a>
                  </td>
                </tr>

                <tr>
                  <td
                    style="padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;text-transform:uppercase;"
                  >
                    Sujet
                  </td>
                </tr>

                <tr>
                  <td
                    style="padding:14px 16px;font-size:15px;color:#0f172a;font-weight:600;"
                  >
                    ${safeSujet}
                  </td>
                </tr>

                <tr>
                  <td
                    style="padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;text-transform:uppercase;"
                  >
                    Message
                  </td>
                </tr>

                <tr>
                  <td
                    style="padding:16px;font-size:15px;color:#334155;line-height:1.6;"
                  >
                    ${safeMessage}
                  </td>
                </tr>
              </table>

              <p
                style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;"
              >
                Reçu le ${new Date().toLocaleString("fr-FR", {
                  timeZone: "Africa/Douala",
                })} — ImoFast Cameroun
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Envoie un message provenant du formulaire de contact.
 *
 * @param {Object} params
 * @param {string} params.nom
 * @param {string} params.email
 * @param {string} params.sujet
 * @param {string} params.message
 * @returns {Promise<Object>}
 */
async function sendContactEmail({
  nom,
  email,
  sujet,
  message,
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.MAIL_USER,
      to: [process.env.MAIL_FROM],
      subject: sujet,
      html: buildContactEmailHtml({
        nom,
        email,
        sujet,
        message,
      }),
    });

    if (error) {
      console.error(
        "[Contact] Erreur Resend:",
        error
      );

      return {
        success: false,
        msg: "Impossible d'envoyer le message.",
      };
    }

    return {
      success: true,
      msg: "Mail envoyé.",
      data,
    };
  } catch (error) {
    console.error(
      "[Contact] Erreur inattendue:",
      error
    );

    return {
      success: false,
      msg: "Une erreur inconnue est survenue.",
    };
  }
}

/**
 * Construit le HTML d'une réponse envoyée à un contact.
 *
 * @param {Object} params
 * @param {string} params.message
 * @returns {string}
 */
function buildContactReplyEmailHtml({ message }) {
  const safeMessage = escapeHtml(message).replace(
    /\n/g,
    "<br>"
  );

  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table
          width="600"
          cellpadding="0"
          cellspacing="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;"
        >
          <tr>
            <td
              style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:28px 32px;text-align:center;"
            >
              <h1
                style="margin:0;color:#ffffff;font-size:24px;font-weight:700;"
              >
                Imo<span style="color:#dbeafe;">Fast</span>
              </h1>

              <p
                style="margin:8px 0 0;color:#dbeafe;font-size:14px;"
              >
                Réponse à votre demande
              </p>
            </td>
          </tr>

          <tr>
            <td
              style="padding:32px;font-size:15px;color:#334155;line-height:1.7;"
            >
              ${safeMessage}
            </td>
          </tr>

          <tr>
            <td
              style="padding:20px 32px;background:#f8fafc;text-align:center;font-size:12px;color:#94a3b8;"
            >
              ImoFast Cameroun
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Envoie une réponse à un contact.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.sujet
 * @param {string} params.message
 * @returns {Promise<Object>}
 */
async function sendContactReplyEmail({
  email,
  sujet,
  message,
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.MAIL_USER,
      to: [email],
      subject: sujet,
      html: buildContactReplyEmailHtml({
        message,
      }),
    });

    if (error) {
      console.error(
        "[Contact Reply] Erreur Resend:",
        error
      );

      return {
        success: false,
        msg: "Impossible d'envoyer la réponse.",
      };
    }

    return {
      success: true,
      msg: "Réponse envoyée.",
      data,
    };
  } catch (error) {
    console.error(
      "[Contact Reply] Erreur inattendue:",
      error
    );

    return {
      success: false,
      msg: "Impossible d'envoyer la réponse.",
    };
  }
}

module.exports = {
  sendContactEmail,
  sendContactReplyEmail,
};