const repository = require('../../repositories/selection-annonce.repository');
const { selectionAnnonceCache } = require('../../cache/selection-annonce.cache');
const { selectionWindows, WEIGHTS } = require('../../utils/listingSelections');
async function computeSelections(now = new Date()) {
  const windows = selectionWindows(now);
  const [featured, populaires] = await Promise.all([
    repository.topBetween(windows.weekStart, windows.weekEnd, 1),
    repository.topBetween(windows.monthStart, windows.monthEnd, 3),
  ]);
  return { vedette: featured[0] || null, populaires, calculeAt: now.toISOString(), poids: WEIGHTS };
}
async function refreshSelections(now = new Date()) {
  const data = await computeSelections(now);
  selectionAnnonceCache.setItem({ id: 'current', data });
  await selectionAnnonceCache.save();
  return data;
}
async function getSelections() {
  const result = await selectionAnnonceCache.getOrLoad({ id: 'current', loader: computeSelections });
  const visible = a => a && (!a.dateExpiration || +new Date(a.dateExpiration) > Date.now());
  return { ...result.data, vedette: visible(result.data.vedette) ? result.data.vedette : null,
    populaires: result.data.populaires.filter(visible) };
}
function removeFromSelections(id) {
  const cached = selectionAnnonceCache.getItem({ id: 'current' });
  if (!cached.success) return;
  selectionAnnonceCache.setItem({ id: 'current', data: { ...cached.data,
    vedette: cached.data.vedette?.idPublic === id ? null : cached.data.vedette,
    populaires: cached.data.populaires.filter(a => a.idPublic !== id) } });
}
module.exports = { getSelections, refreshSelections, removeFromSelections, computeSelections };
