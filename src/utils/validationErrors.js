function localizedIssues(error, req) {
  const t = req.t || require('../config/i18n.config').t.bind(require('../config/i18n.config'));
  return error.issues.map(issue => ({ ...issue,
    message: issue.message.startsWith('errors:') ? t(issue.message) : t('errors:validation.invalidField', { champ: issue.path.join('.') || 'body' }),
  }));
}
function localizedFlatten(error, req) {
  const formErrors = [], fieldErrors = {};
  for (const issue of localizedIssues(error, req)) {
    if (!issue.path.length) formErrors.push(issue.message);
    else (fieldErrors[issue.path[0]] ||= []).push(issue.message);
  }
  return { formErrors, fieldErrors };
}
module.exports = { localizedIssues, localizedFlatten };
