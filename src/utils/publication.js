const AppError = require('../errors/AppError');
function normalizeStatus(status) {
  return ({ active: 'publier', en_ligne: 'publier', 'en ligne': 'publier', programmee: 'programmee', 'programmée': 'programmee' })[status] || status;
}
function publicationFields(input, previous = {}, now = new Date()) {
  const explicitStatus = input.status !== undefined;
  let status = normalizeStatus(input.status ?? previous.status ?? 'publier');
  const requestedDate = input.datePublication !== undefined ? input.datePublication : previous.datePublication;
  let date = requestedDate ? new Date(requestedDate) : null;
  if (date && !Number.isFinite(+date)) throw new AppError('errors:backend.invalidPublicationDate', 400);
  if (!explicitStatus && input.datePublication && +date > +now) status = 'programmee';
  if (status === 'programmee' && (!date || +date <= +now)) throw new AppError('errors:backend.futurePublication', 400);
  if (status === 'publier' && previous.status !== 'publier') date = now;
  if (status === 'publier' && !date) date = now;
  if (status === 'brouillon') date = null;
  const expiry = input.dateExpiration ?? previous.dateExpiration;
  if (expiry && (!Number.isFinite(+new Date(expiry)) || (date && +new Date(expiry) <= +date)))
    throw new AppError('errors:backend.invalidExpiration', 400);
  return { status, estPubliee: status === 'publier', datePublication: date?.toISOString() ?? null,
    ...(input.dateExpiration !== undefined ? { dateExpiration: input.dateExpiration ? new Date(input.dateExpiration).toISOString() : null } : {}) };
}
module.exports = { normalizeStatus, publicationFields };
