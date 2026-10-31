// src/utils/bailleurCompletude.js

const filled = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v) && v > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return Boolean(v);
};

// Total des annonces : on prend le plus grand entre annoncesTotal et le total des biens
// (accepte aussi la faute "annnoncesTotal" présente dans le modèle)
const totalAnnonces = (activite) => {
  const a = activite || {};
  const annonces = Number(a.annoncesTotal ?? a.annnoncesTotal) || 0;
  const biens = Number(a.bien) || 0;
  return Math.max(annonces, biens);
};

const estAgence = (p) => p.typeProfil === "agence";

const REGLES_COMPLETUDE_BAILLEUR = [
  // Identité (26)
  { cle: "nom",           label: "Nom",               poids: 6, rempli: (p) => filled(p.nom) },
  { cle: "prenom",        label: "Prénom",            poids: 6, rempli: (p) => filled(p.prenom) },
  { cle: "photoProfil",   label: "Photo de profil",   poids: 8, rempli: (p) => filled(p.photoProfil) },
  { cle: "dateNaissance", label: "Date de naissance", poids: 4, rempli: (p) => filled(p.dateNaissance) },
  { cle: "sexe",          label: "Sexe",              poids: 2, rempli: (p) => filled(p.sexe) },

  // Agence (4) : comptée seulement si typeProfil === "agence"
  { cle: "nomAgence", label: "Nom de l'agence", poids: 4,
    applicable: estAgence, rempli: (p) => filled(p.nomAgence) },

  // Contact (18)
  { cle: "email",       label: "Email",              poids: 8, rempli: (p) => filled(p.email) },
  { cle: "telephone",   label: "Téléphone",          poids: 8, rempli: (p) => filled(p.telephone) },
  { cle: "autreNumero", label: "Deuxième numéro",    poids: 2, rempli: (p) => filled(p.autreNumero) },

  // Localisation (10)
  { cle: "localisation.ville",    label: "Ville",    poids: 4, rempli: (p) => filled(p.localisation?.ville) },
  { cle: "localisation.quartier", label: "Quartier", poids: 3,
    rempli: (p) => filled(p.localisation?.quartier ?? p.localisation?.quatier) },
  { cle: "localisation.adresse",  label: "Adresse",  poids: 3, rempli: (p) => filled(p.localisation?.adresse) },

  // Documents (16)
  { cle: "cni.imageRecto", label: "CNI (recto)", poids: 6, rempli: (p) => filled(p.cni?.imageRecto) },
  { cle: "cni.imageVerso", label: "CNI (verso)", poids: 6, rempli: (p) => filled(p.cni?.imageVerso) },
  { cle: "imageAnciensContrats", label: "Anciens contrats", poids: 4,
    rempli: (p) => filled(p.imageAnciensContrats) },

  // Vérifications (16)
  { cle: "verification.emailVerifie", label: "Email vérifié", poids: 4,
    rempli: (p) => (p.verification?.emailVerifie ?? p.emailVerifie) === true },
  { cle: "verification.telephoneVerifie", label: "Téléphone vérifié", poids: 5,
    rempli: (p) => p.verification?.telephoneVerifie === true },
  { cle: "verification.cniVerified", label: "Pièce d'identité vérifiée", poids: 7,
    rempli: (p) => p.verification?.cniVerified === true },

  // Activité (10)
  { cle: "activite.annonces", label: "Au moins une annonce publiée", poids: 10,
    rempli: (p) => totalAnnonces(p.activite) > 0 },
];

function calculerCompletudeBailleur(profil = {}, regles = REGLES_COMPLETUDE_BAILLEUR) {
  const applicables = regles.filter((r) => !r.applicable || r.applicable(profil));
  const pointsTotal = applicables.reduce((s, r) => s + r.poids, 0);

  let pointsObtenus = 0;
  const manquants = [];

  for (const r of applicables) {
    if (r.rempli(profil)) pointsObtenus += r.poids;
    else manquants.push({ cle: r.cle, label: r.label, poids: r.poids });
  }

  manquants.sort((a, b) => b.poids - a.poids);

  return {
    pourcentage: pointsTotal === 0 ? 0 : Math.round((pointsObtenus / pointsTotal) * 100),
    pointsObtenus,
    pointsTotal,
    manquants,
    prochaineEtape: manquants[0] ?? null,
  };
}

module.exports = { REGLES_COMPLETUDE_BAILLEUR, calculerCompletudeBailleur, totalAnnonces };