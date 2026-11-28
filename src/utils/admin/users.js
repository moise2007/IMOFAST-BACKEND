const { z } = require('zod');
const { assertAgencyName } = require('../agencyName');
const profileSchema = z.object({
  nom: z.string().trim().min(2).max(100), prenom: z.string().trim().max(100).default(''),
  email: z.union([z.email(), z.literal('')]).transform(v => v.toLowerCase()),
  telephone: z.string().trim().transform(v => v.replace(/[\s().-]/g, '')).refine(v => !v || /^\+?[0-9]{8,15}$/.test(v), 'Numéro invalide'),
  nomAgence: z.string().trim().max(120).default(''),
}).strict().refine(v => v.email || v.telephone, 'Un email ou un téléphone est requis');
function parseProfile(body, group, creating = false) {
  if (!['locataire', 'bailleur', 'agence'].includes(group)) throw new Error('Groupe invalide');
  const { password, ...fields } = body;
  const data = profileSchema.parse(fields);
  if (group === 'agence' && !data.nomAgence) throw new Error('Le nom de l’agence est requis');
  assertAgencyName(data.nomAgence);
  if (creating && (typeof password !== 'string' || password.length < 12 || password.length > 72)) throw new Error('Le mot de passe doit contenir entre 12 et 72 caractères');
  return { ...data, email: data.email || null, telephone: data.telephone || null, nomAgence: group === 'agence' ? data.nomAgence : null, ...(creating ? { password } : {}) };
}
function publicUser(doc, role) {
  const d = doc.data();
  return { id: doc.id, role, group: role === 'locataire' ? role : d.typeProfil === 'agence' ? 'agence' : 'bailleur', nom: d.nom || '', prenom: d.prenom || '', email: d.email || '', telephone: d.telephone || '', nomAgence: d.nomAgence || '', status: d.status || 'actif', verified: d.verification?.isVerified === true, createdAt: d.createdAt?.toDate?.().toISOString() || null };
}
module.exports = { parseProfile, publicUser };
