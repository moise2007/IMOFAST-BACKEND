const { db } = require('../../config/firebase');
const { aggregateAnalytics } = require('../../utils/admin/analytics');
exports.analytics = async (req, res) => {
  const days = Number(req.query.days ?? 30);
  if (![7, 30, 90].includes(days)) return res.status(400).json({ success: false, msg: 'Période invalide.' });
  try {
    // Return aggregates only: account details never leave this endpoint.
    const fields = { locataire: ['createdAt'], bailleur: ['createdAt'], annonce: ['createdAt'], alerte: ['createdAt'], analitic: ['pages', 'operatingSystem', 'device', 'location'] };
    const entries = await Promise.all(Object.entries(fields).map(async ([name, selected]) => {
      const snapshot = await db.collection(name).select(...selected).get();
      return [name, snapshot.docs.map(doc => doc.data())];
    }));
    res.json({ success: true, ...aggregateAnalytics(Object.fromEntries(entries), days) });
  } catch (error) {
    console.error('Admin analytics:', error.message);
    res.status(500).json({ success: false, msg: 'Impossible de charger les statistiques.' });
  }
};
