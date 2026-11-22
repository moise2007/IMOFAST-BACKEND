module.exports = (err, req, res, next) => {
  const t = req.t || require('../config/i18n.config').t.bind(require('../config/i18n.config'));
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: t('errors:backend.invalidJson') });
  const status = Number(err.statusCode);
  if (err.isOperational || (status >= 400 && status < 500)) {
    const key = typeof err.message === 'string' && err.message.startsWith('errors:') ? err.message : null;
    return res.status(status >= 400 && status < 600 ? status : 400).json({ success: false,
      message: key ? t(key) : err.message, ...err.extra });
  }
  console.error('request-error', err.code || err.name);
  return res.status(500).json({ success: false, message: t('errors:backend.server') });
};
