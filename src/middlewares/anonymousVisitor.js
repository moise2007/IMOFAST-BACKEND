const { randomUUID } = require('node:crypto');
module.exports = (req, res, next) => {
  const supplied = req.cookies?.imofast_visitor;
  req.anonymousId = /^anon_[0-9a-f-]{36}$/.test(supplied || '') ? supplied : `anon_${randomUUID()}`;
  if (req.anonymousId !== supplied) res.cookie('imofast_visitor', req.anonymousId, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    maxAge: 365 * 86400000, path: '/',
  });
  next();
};
