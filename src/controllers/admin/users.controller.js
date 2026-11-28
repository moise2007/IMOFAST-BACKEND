const { db, admin } = require('../../config/firebase');
const bcrypt = require('bcrypt');
const { Bailleur } = require('../../models/bailleur');
const { Locataire } = require('../../models/locataire');
const { parseProfile, publicUser } = require('../../utils/admin/users');
const roleFor = group => group === 'locataire' ? 'locataire' : 'bailleur';
const validGroup = group => ['locataire', 'bailleur', 'agence'].includes(group);
const safeId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,150}$/.test(id);
const fail = (res, status, msg) => res.status(status).json({ success: false, msg });
exports.list = async (req, res) => {
  if (!validGroup(req.query.group)) return fail(res, 400, 'Groupe invalide');
  try {
    const role = roleFor(req.query.group);
    const snapshot = await db.collection(role).select('nom', 'prenom', 'email', 'telephone', 'nomAgence', 'typeProfil', 'status', 'verification', 'createdAt').get();
    res.json({ success: true, users: snapshot.docs.map(doc => publicUser(doc, role)).filter(u => u.group === req.query.group) });
  } catch { fail(res, 500, 'Impossible de charger les utilisateurs'); }
};
exports.save = async (req, res) => {
  const group = req.params.group;
  if (!validGroup(group) || (req.params.id && !safeId(req.params.id))) return fail(res, 400, 'Utilisateur invalide');
  const creating = !req.params.id;
  let input;
  try { input = parseProfile(req.body, group, creating); } catch (error) { return fail(res, 400, error.issues?.[0]?.message || error.message); }
  try {
    const role = roleFor(group);
    const ref = creating ? db.collection(role).doc() : db.collection(role).doc(req.params.id);
    const password = creating ? await bcrypt.hash(input.password, 12) : null;
    delete input.password;
    const result = await db.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (!creating && (!current.exists || publicUser(current, role).group !== group)) return { status: 404, msg: 'Compte introuvable' };
      if (!creating && current.data().status === 'archive') return { status: 409, msg: 'Restaurez le compte avant de le modifier' };
      for (const field of ['email', 'telephone']) {
        if (!input[field]) continue;
        const matches = await tx.get(db.collection(role).where(field, '==', input[field]));
        if (matches.docs.some(doc => doc.id !== ref.id)) return { status: 409, msg: 'Cet email ou téléphone est déjà utilisé dans ce rôle' };
      }
      const now = admin.firestore.Timestamp.now();
      let data;
      if (creating) {
        const fields = { ...input, password, typeProfil: group };
        data = role === 'locataire' ? new Locataire(fields).toFirebase() : new Bailleur(fields).toFirebase();
        // Verification of identity is separate from verification of contact ownership.
        data.createdByAdmin = req.user.id || req.user.idPublic;
        tx.set(ref, data);
      } else {
        data = { ...input, updatedAt: now };
        if (current.data().email !== input.email) data['verification.emailVerifie'] = false;
        if (current.data().telephone !== input.telephone) data['verification.telephoneVerifie'] = false;
        tx.update(ref, data);
      }
      tx.set(db.collection('adminAudit').doc(), { action: creating ? 'createUser' : 'updateUser', role, userId: ref.id, adminId: req.user.id || req.user.idPublic || null, createdAt: now });
      return { id: ref.id };
    });
    if (result.status) return fail(res, result.status, result.msg);
    res.status(creating ? 201 : 200).json({ success: true, id: result.id });
  } catch (error) { console.error('Admin users save:', error.message); fail(res, 500, 'Impossible d’enregistrer le compte'); }
};
exports.action = async (req, res) => {
  const { group, id } = req.params;
  const action = req.body.action;
  if (!validGroup(group) || !safeId(id) || !['suspend', 'activate', 'archive', 'verify', 'unverify'].includes(action)) return fail(res, 400, 'Action invalide');
  try {
    const role = roleFor(group);
    const ref = db.collection(role).doc(id);
    const result = await db.runTransaction(async tx => {
      const doc = await tx.get(ref);
      if (!doc.exists || publicUser(doc, role).group !== group) return false;
      const now = admin.firestore.Timestamp.now();
      const patch = { updatedAt: now };
      if (['verify', 'unverify'].includes(action)) patch['verification.isVerified'] = action === 'verify';
      else { patch.status = { suspend: 'suspendus', activate: 'actif', archive: 'archive' }[action]; patch.finSuspension = null; patch.dateSuspension = action === 'suspend' ? now : null; patch.archivedAt = action === 'archive' ? now : null; }
      tx.update(ref, patch);
      tx.set(db.collection('adminAudit').doc(), { action, role, userId: id, adminId: req.user.id || req.user.idPublic || null, createdAt: now });
      return true;
    });
    if (!result) return fail(res, 404, 'Compte introuvable');
    res.json({ success: true });
  } catch { fail(res, 500, 'Impossible d’appliquer cette action'); }
};
