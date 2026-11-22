function rentalAmounts(option = {}) {
  const amount = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const nombre = Number.isInteger(Number(option.min)) && Number(option.min) >= 1 ? Number(option.min) : 1;
  const prix = amount(option.prix), caution = amount(option.caution), fraisVisite = amount(option.fraisVisite);
  const loyer = prix * nombre;
  return { nombre, prix, caution, fraisVisite, loyer, totalAPayer: loyer + caution, totalAvecVisite: loyer + caution + fraisVisite };
}
function ratingSummary(notes = []) {
  const distribution = Array.from({ length: 5 }, (_, index) => ({ note: index + 1, nombre: (Array.isArray(notes) ? notes : []).filter(entry => entry?.note === index + 1).reduce((total, entry) => total + (Number.isSafeInteger(entry.nombre) && entry.nombre > 0 ? entry.nombre : 0), 0) }));
  const nombre = distribution.reduce((sum, entry) => sum + entry.nombre, 0);
  const somme = distribution.reduce((sum, entry) => sum + entry.note * entry.nombre, 0);
  return { nombre, moyenne: nombre ? Math.round(somme / nombre * 100) / 100 : null, distribution: distribution.map(entry => ({ ...entry, pourcentage: nombre ? Math.round(entry.nombre / nombre * 100) : 0 })) };
}
function annoncePresentation(annonce = {}, owner) {
  const options = Array.isArray(annonce.loyer) ? annonce.loyer : annonce.loyer ? [annonce.loyer] : [];
  return { rentalOptions: options.map(rentalAmounts), notes: ratingSummary(annonce.notes), ownerNotes: ratingSummary(owner?.notes) };
}
module.exports = { rentalAmounts, ratingSummary, annoncePresentation };
