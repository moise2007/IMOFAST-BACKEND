const jwt = require('jsonwebtoken');
const repository = require('../../repositories/session.repository');
const { createAccessToken } = require('../../utils/session');
async function resolveSession({ accessToken, refreshToken, refresh = false }) {
  let session;
  if (accessToken && !refresh) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (typeof decoded.idsession === 'string') session = await repository.findSession(decoded.idsession);
    } catch (error) {
      if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) throw error;
    }
  }
  let tokens;
  if (!session && refreshToken) {
    const rotated = await repository.rotateRefresh(refreshToken);
    if (rotated) {
      session = rotated.session;
      tokens = { accessToken: createAccessToken(session.id), refreshToken: rotated.refreshToken };
    }
  }
  const user = await repository.findUser(session);
  if (!user || (session.role === 'admin' ? user.active !== true : user.status !== 'actif')) return null;
  return { user, role: session.role, sessionId: session.id, tokens };
}
module.exports = { resolveSession };
