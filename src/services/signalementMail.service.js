const { db } = require('../config/firebase');
const i18n = require('../config/i18n.config');
async function deliver(documentId, signalement) {
  if (!process.env.ADMIN_REPORT_EMAIL) return false;
  const t = i18n.getFixedT(process.env.ADMIN_LANGUAGE || 'fr', 'emails');
  const { resend } = require('../config/mail.config');
  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM || 'Imofast <contact@imofast.org>', to: [process.env.ADMIN_REPORT_EMAIL],
    subject: t('report.subject'),
    text: t('report.body', { id: signalement.idPublic, cible: signalement.idCible,
      raison: t(`report.reasons.${signalement.raison}`), description: signalement.description || '', interpolation: { escapeValue: false } }),
  }, { idempotencyKey: `report-${signalement.idPublic}` });
  if (error) return false;
  await db.collection('signalement').doc(documentId).update({ emailAdminPending: false, emailAdminSentAt: new Date() });
  return true;
}
async function retryPending() {
  if (!process.env.ADMIN_REPORT_EMAIL) return;
  const pending = await db.collection('signalement').where('emailAdminPending', '==', true).limit(25).get();
  for (const doc of pending.docs) await deliver(doc.id, doc.data()).catch(error => console.error('report-mail', error.code || error.name));
}
module.exports = { deliver, retryPending };
