const AppError = require('../errors/AppError');
function canonicalAgencyName(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[1!|ıі]/g, 'i').replace(/[0οо]/g, 'o').replace(/[4@а]/g, 'a')
    .replace(/[5$ѕ]/g, 's').replace(/[7т]/g, 't').replace(/rn/g, 'm').replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1');
}
function isReservedAgencyName(value) { return canonicalAgencyName(value).includes('imofast'); }
function assertAgencyName(value) {
  if (value != null && typeof value !== 'string') throw new AppError('errors:backend.invalidInput', 400);
  if (isReservedAgencyName(value)) throw new AppError('errors:backend.reservedAgencyName', 400);
}
module.exports = { canonicalAgencyName, isReservedAgencyName, assertAgencyName };
