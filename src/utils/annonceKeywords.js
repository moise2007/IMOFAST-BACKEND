const STOP_WORDS = new Set(('a au aux avec ce ces cet cette dans de des du elle en et eux il je la le les leur lui ma mais me mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous est sont etait etre the a an and are as at be by for from in into is it of on or that this to was with you your').split(' '));
function normalize(value) { return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function tokens(text, limit = 128) {
  return [...new Set((normalize(text).match(/[a-z0-9]{2,32}/g) || []).filter(word => !STOP_WORDS.has(word)))].slice(0, limit);
}
function buildKeywordRecord(annonce, bien = {}) {
  const mots = tokens([annonce.titre, bien.localisation?.ville, bien.localisation?.quartier || bien.localisation?.quatier,
    bien.localisation?.adresse, bien.typeBien, bien.type, bien.nature, annonce.nature, annonce.description].filter(Boolean).join(' '));
  const prefixes = [...new Set(mots.flatMap(word => Array.from({ length: word.length - 1 }, (_, i) => word.slice(0, i + 2))))];
  const loyer = (Array.isArray(annonce.loyer) ? annonce.loyer : [annonce.loyer]).filter(Boolean);
  return { annonceId: annonce.idPublic, bienId: annonce.bienId, bailleurId: annonce.bailleurId,
    status: annonce.status, mots, prefixes, typeBien: bien.typeBien || '', type: bien.type || '',
    nature: normalize(bien.nature) === 'meuble' ? 'meubler' : bien.nature || '', natureAnnonce: annonce.nature || 'location',
    ville: normalize(bien.localisation?.ville), quartier: normalize(bien.localisation?.quartier || bien.localisation?.quatier),
    devise: annonce.devise || 'XAF', loyer, minPrix: Math.min(...loyer.map(p => Number(p.prix)).filter(Number.isFinite), Number.MAX_SAFE_INTEGER),
    nombreChambre: bien.chambres?.nombre || 0, nombreDouche: bien.salleBains?.nombre || 0,
    createdAt: annonce.createdAt, updatedAt: annonce.updatedAt,
  };
}
function matchesFilters(record, filters) {
  for (const field of ['bailleurId', 'status', 'ville', 'quartier', 'typeBien', 'type', 'nature', 'natureAnnonce', 'devise']) {
    if (filters[field] != null && filters[field] !== '' && normalize(record[field]) !== normalize(filters[field])) return false;
  }
  if (filters.nature && record.typeBien !== 'logement') return false;
  for (const field of ['nombreChambre', 'nombreDouche']) if (filters[field] != null && record[field] < filters[field]) return false;
  if ([filters.prixMin, filters.prixMax, filters.duree, filters.nombreDurees].some(v => v != null)) {
    if ((filters.duree || filters.nombreDurees) && record.natureAnnonce !== 'location') return false;
    if (!record.loyer.some(p => (filters.prixMin == null || p.prix >= filters.prixMin) &&
      (filters.prixMax == null || p.prix <= filters.prixMax) && (!filters.duree || p.duree === filters.duree) &&
      (filters.nombreDurees == null || (p.min ?? 1) <= filters.nombreDurees))) return false;
  }
  return true;
}
function keywordScore(record, queryTokens) { return queryTokens.reduce((score, token) => score + (record.mots.some(word => word.startsWith(token)) ? 1 : 0), 0); }
module.exports = { normalize, tokens, buildKeywordRecord, matchesFilters, keywordScore };
