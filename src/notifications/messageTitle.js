function messageNotificationTitle(sender, lang = 'fr') {
  const agency = typeof sender?.nomAgence === "string" ? sender.nomAgence.trim() : "";
  const person = [sender?.prenom, sender?.nom]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim())
    .join(" ");
  const name = (agency || person).replace(/\s+/g, " ").slice(0, 80);
  const t = require('../config/i18n.config').getFixedT(lang, 'responses');
  return name ? t('backend.push.messageFrom', { name }) : t('backend.push.messageDefault');
}

module.exports = { messageNotificationTitle };
