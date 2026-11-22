// utils/profilCompletude.js

// Vrai si la valeur contient réellement quelque chose
const filled = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v) && v > 0;
  if (Array.isArray(v)) return v.length > 0;
  return Boolean(v);
};

const REGLES_COMPLETUDE = [
  // Identité
  { cle: "nom",           label: "Nom",               poids: 8,  rempli: (p) => filled(p.nom) },
  { cle: "prenom",        label: "Prénom",            poids: 8,  rempli: (p) => filled(p.prenom) },
  { cle: "photoProfil",   label: "Photo de profil",   poids: 10, rempli: (p) => filled(p.photoProfil) },
  { cle: "dateNaissance", label: "Date de naissance", poids: 6,  rempli: (p) => filled(p.dateNaissance) },
  { cle: "sexe",          label: "Sexe",              poids: 3,  rempli: (p) => filled(p.sexe) },
  { cle: "metier",        label: "Métier",            poids: 4,  rempli: (p) => filled(p.metier) },

  // Contact
  { cle: "email",         label: "Email",             poids: 10, rempli: (p) => filled(p.email) },
  { cle: "telephone",     label: "Téléphone",         poids: 10, rempli: (p) => filled(p.telephone) },

  // Préférences
  { cle: "preferences.typeLogement", label: "Type de logement",  poids: 5, rempli: (p) => filled(p.preferences?.typeLogement) },
  { cle: "preferences.maxBudget",    label: "Budget maximal",    poids: 5, rempli: (p) => filled(p.preferences?.maxBudget) },
  { cle: "preferences.quartier",     label: "Quartier souhaité", poids: 5, rempli: (p) => filled(p.preferences?.quartier) },

  // Localisation
  { cle: "localisation.pays",     label: "Pays",     poids: 2, rempli: (p) => filled(p.localisation?.pays) },
  { cle: "localisation.ville",    label: "Ville",    poids: 3, rempli: (p) => filled(p.localisation?.ville) },
  { cle: "localisation.quartier", label: "Quartier", poids: 3, rempli: (p) => filled(p.localisation?.quartier) || filled(p.localisation?.quatier) },
  { cle: "localisation.adresse",  label: "Adresse",  poids: 2, rempli: (p) => filled(p.localisation?.adresse) },

  // Vérifications
  {
    cle: "verification.emailVerifie", label: "Email vérifié", poids: 5,
    rempli: (p) => (p.verification?.emailVerifie ?? p.emailVerifie) === true,
  },
  {
    cle: "verification.telephoneVerifie", label: "Téléphone vérifié", poids: 5,
    rempli: (p) => (p.verification?.telephoneVerifie ?? p.telephoneVerifie) === true,
  },
  {
    cle: "verification.cniVerified", label: "Pièce d'identité vérifiée", poids: 6,
    rempli: (p) => p.verification?.cniVerified === true,
  },
];

/**
 * Calcule le pourcentage de complétude d'un profil.
 * @param {object} profil
 * @param {Array} regles - optionnel, pour un barème personnalisé
 * @returns {{
 *   pourcentage: number,
 *   pointsObtenus: number,
 *   pointsTotal: number,
 *   manquants: {cle: string, label: string, poids: number}[],
 *   prochaineEtape: {cle: string, label: string, poids: number} | null
 * }}
 */
function calculerCompletudeProfil(profil = {}, regles = REGLES_COMPLETUDE) {
  const pointsTotal = regles.reduce((somme, r) => somme + r.poids, 0);

  let pointsObtenus = 0;
  const manquants = [];

  for (const r of regles) {
    if (r.rempli(profil)) {
      pointsObtenus += r.poids;
    } else {
      manquants.push({ cle: r.cle, label: r.label, poids: r.poids });
    }
  }

  // Les champs les plus importants en premier
  manquants.sort((a, b) => b.poids - a.poids);

  return {
    pourcentage: pointsTotal === 0 ? 0 : Math.round((pointsObtenus / pointsTotal) * 100),
    pointsObtenus,
    pointsTotal,
    manquants,
    prochaineEtape: manquants[0] ?? null,
  };
}

module.exports = {calculerCompletudeProfil, REGLES_COMPLETUDE}