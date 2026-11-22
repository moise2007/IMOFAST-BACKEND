const { getToken } = require('../utils/session');
const { resolveSession } = require('../services/ApiService/session.service');
const translate = (req, key) => req.t ? req.t(`errors:backend.${key}`) : require('../config/i18n.config').t(`errors:backend.${key}`);
const createAuthMiddleware = (roles = []) => async (req, res, next) => {
  try {
    const identity = await resolveSession({ accessToken: getToken(req) });
    if (!identity) return res.status(401).json({ success: false, reconnection: true, msg: translate(req, 'sessionInvalid') });
    if (!roles.includes(identity.role)) return res.status(403).json({ success: false, msg: translate(req, 'forbidden') });
    const { user, role } = identity;
    if (role === 'admin' ? user.verified !== true : !(user.verification?.emailVerifie || user.verification?.telephoneVerifie))
      return res.status(403).json({ success: false, fetchApi: true, msg: translate(req, 'accountUnverified') });
    req.user = user; req.role = role; req.sessionId = identity.sessionId;
    next();
  } catch (error) { next(error); }
};
const identifierUtilisateur = async (req, res, next) => {
  req.user = null; req.role = 'visiteur'; req.sessionId = null;
  try {
    const identity = await resolveSession({ accessToken: getToken(req) });
    if (identity && (identity.user.verification?.emailVerifie || identity.user.verification?.telephoneVerifie || identity.role === 'admin')) {
      req.user = identity.user; req.role = identity.role; req.sessionId = identity.sessionId;
    }
    next();
  } catch (error) { next(error); }
};
module.exports = {
  authLocataire: createAuthMiddleware(['locataire']), authBailleur: createAuthMiddleware(['bailleur']),
  authAdmin: createAuthMiddleware(['admin']), authBailleurLocataire: createAuthMiddleware(['bailleur', 'locataire']),
  authBailleurAdmin: createAuthMiddleware(['bailleur', 'admin']), authAdminLocataire: createAuthMiddleware(['admin', 'locataire']),
  authBailleurLocataireAdmin: createAuthMiddleware(['bailleur', 'locataire', 'admin']), identifierUtilisateur,
};
