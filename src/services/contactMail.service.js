const {
  createMailTransport,
  CONTACT_RECIPIENT,
  getMailConfig,
} = require("../config/mail.config");

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildContactEmailHtml({ nom, email, sujet, message }) {
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
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
                Imo<span style="color:#dbeafe;">Fast</span>
              </h1>
              <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">Nouveau message depuis le formulaire de contact</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;text-transform:uppercase;">Nom complet</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:15px;color:#0f172a;font-weight:600;">${safeNom}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;text-transform:uppercase;">E-mail</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:15px;">
                    <a href="mailto:${safeEmail}" style="color:#2563eb;text-decoration:none;">${safeEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;text-transform:uppercase;">Sujet</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:15px;color:#0f172a;font-weight:600;">${safeSujet}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;text-transform:uppercase;">Message</td>
                </tr>
                <tr>
                  <td style="padding:16px;font-size:15px;color:#334155;line-height:1.6;">${safeMessage}</td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
                Reçu le ${new Date().toLocaleString("fr-FR", { timeZone: "Africa/Douala" })} — ImoFast Cameroun
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

async function sendContactEmail({ nom, email, sujet, message }) {
  const { user } = getMailConfig();
  const transport = createMailTransport();

  const mailOptions = {
    from: `"ImoFast Contact" <${user}>`,
    to: CONTACT_RECIPIENT,
    replyTo: `"${nom}" <${email}>`,
    subject: `[ImoFast Contact] ${sujet}`,
    html: buildContactEmailHtml({ nom, email, sujet, message }),
    text: `Nom: ${nom}\nEmail: ${email}\nSujet: ${sujet}\n\nMessage:\n${message}`,
  };

  const info = await transport.sendMail(mailOptions);
  console.log(`[Contact] Email envoyé → ${CONTACT_RECIPIENT} (id: ${info.messageId})`);
  return info;
}

module.exports = { sendContactEmail, CONTACT_RECIPIENT };
