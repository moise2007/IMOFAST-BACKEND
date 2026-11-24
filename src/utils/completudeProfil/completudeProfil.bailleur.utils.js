function filled(value) {
  if (value === null || value === undefined) return false;

  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "boolean") return value;
  if (value instanceof Date) return Number.isFinite(value.getTime());

  if (Array.isArray(value)) return value.some(filled);

  if (typeof value === "object") {
    return Object.values(value).some(filled);
  }

  return Boolean(value);
}

/**
 * Le taux d'activité porte sur les annonces, pas sur les biens.
 * On accepte l'ancien nom annnoncesTotal pour rester compatible avec
 * les profils déjà enregistrés dans Firestore.
 */
function totalAnnonces(activite = {}) {
  const value = Number(activite.annoncesTotal ?? activite.annnoncesTotal ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

const estAgence = (profil = {}) =>
  String(profil.typeProfil || "").trim().toLowerCase() === "agence";

const REGLES_COMPLETUDE_BAILLEUR = [
  // Identité (26 points)
  { cle: "nom", label: "Nom", poids: 6, rempli: (p) => filled(p.nom) },
  { cle: "prenom", label: "Prénom", poids: 6, rempli: (p) => filled(p.prenom) },
  { cle: "photoProfil", label: "Photo de profil", poids: 8, rempli: (p) => filled(p.photoProfil) },
  { cle: "dateNaissance", label: "Date de naissance", poids: 4, rempli: (p) => filled(p.dateNaissance) },
  { cle: "sexe", label: "Sexe", poids: 2, rempli: (p) => filled(p.sexe) },

  // Agence (4 points), uniquement pour les profils agence
  {
    cle: "nomAgence",
    label: "Nom de l'agence",
    poids: 4,
    applicable: estAgence,
    rempli: (p) => filled(p.nomAgence),
  },

  // Contact (18 points)
  { cle: "email", label: "Email", poids: 8, rempli: (p) => filled(p.email) },
  { cle: "telephone", label: "Téléphone", poids: 8, rempli: (p) => filled(p.telephone) },
  { cle: "autreNumero", label: "Deuxième numéro", poids: 2, rempli: (p) => filled(p.autreNumero) },

  // Localisation (10 points)
  {
    cle: "localisation.ville",
    label: "Ville",
    poids: 4,
    rempli: (p) => filled(p.localisation?.ville),
  },
  {
    cle: "localisation.quartier",
    label: "Quartier",
    poids: 3,
    rempli: (p) => filled(p.localisation?.quartier ?? p.localisation?.quatier),
  },
  {
    cle: "localisation.adresse",
    label: "Adresse",
    poids: 3,
    rempli: (p) => filled(p.localisation?.adresse),
  },

  // Documents (16 points)
  { cle: "cni.imageRecto", label: "CNI (recto)", poids: 6, rempli: (p) => filled(p.cni?.imageRecto) },
  { cle: "cni.imageVerso", label: "CNI (verso)", poids: 6, rempli: (p) => filled(p.cni?.imageVerso) },
  {
    cle: "imageAnciensContrats",
    label: "Anciens contrats",
    poids: 4,
    rempli: (p) => filled(p.imageAnciensContrats),
  },

  // Vérifications (16 points)
  {
    cle: "verification.emailVerifie",
    label: "Email vérifié",
    poids: 4,
    rempli: (p) => (p.verification?.emailVerifie ?? p.emailVerifie) === true,
  },
  {
    cle: "verification.telephoneVerifie",
    label: "Téléphone vérifié",
    poids: 5,
    rempli: (p) => (p.verification?.telephoneVerifie ?? p.telephoneVerifie) === true,
  },

  // Activité (10 points)
  {
    cle: "activite.annonces",
    label: "Au moins une annonce créée",
    poids: 17,
    rempli: (p) => totalAnnonces(p.activite) > 0,
  },
];

function calculerCompletudeBailleur(profil = {}, regles = REGLES_COMPLETUDE_BAILLEUR) {
  const applicables = regles.filter(
    (rule) => typeof rule.applicable !== "function" || rule.applicable(profil),
  );

  const pointsTotal = applicables.reduce((sum, rule) => sum + rule.poids, 0);
  let pointsObtenus = 0;
  const manquants = [];

  for (const rule of applicables) {
    if (rule.rempli(profil)) {
      pointsObtenus += rule.poids;
    } else {
      manquants.push({
        cle: rule.cle,
        label: rule.label,
        poids: rule.poids,
      });
    }
  }

  manquants.sort((a, b) => b.poids - a.poids);

  return {
    pourcentage: pointsTotal > 0 ? Math.round((pointsObtenus / pointsTotal) * 100) : 0,
    pointsObtenus,
    pointsTotal,
    manquants,
    prochaineEtape: manquants[0] ?? null,
  };
}

module.exports = {
  REGLES_COMPLETUDE_BAILLEUR,
  calculerCompletudeBailleur,
  totalAnnonces,
};
