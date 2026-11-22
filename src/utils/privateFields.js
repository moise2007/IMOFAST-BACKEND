// Shared HTTP serialization boundary, including nested user objects.
function publicJsonReplacer(key, value) {
  if (['activiteInterne', 'password', 'refreshTokenHash', 'refreshHash'].includes(key)) return undefined;
  if (key === 'notifications' && Array.isArray(value) && value.some(s => s?.endpoint)) return undefined;
  if (key === 'notification' && value && typeof value === 'object' && ('web' in value || 'mobile' in value)) return undefined;
  return value;
}
module.exports = { publicJsonReplacer };
