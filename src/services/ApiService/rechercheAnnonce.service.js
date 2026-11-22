const { db, admin } = require("../../config/firebase");

const SEARCH_FIELDS = [
  "search", "titre", "ville", "quartier", "devise", "prixMin", "prixMax",
  "natureAnnonce", "typeBien", "type", "nature", "nombreChambre", "nombreDouche", "duree", "nombreDurees",
];
const MEANINGFUL_FIELDS = SEARCH_FIELDS.filter((field) => !["devise", "natureAnnonce"].includes(field));

const searchCriteria = (filters = {}) => Object.fromEntries(
  SEARCH_FIELDS.filter((field) => filters[field] !== undefined && filters[field] !== null && filters[field] !== "")
    .map((field) => [field, filters[field]])
);

const isSearch = (filters) => MEANINGFUL_FIELDS.some((field) => filters[field] !== undefined);

const collectionFor = (user) => db.collection("locataire").doc(user.id).collection("recherchesAnnonces");

async function saveSearch({ filters, user, role }) {
  if (role !== "locataire" || filters.page !== 1) return;
  const criteres = searchCriteria(filters);
  if (!isSearch(criteres)) return;
  await collectionFor(user).add({ criteres, createdAt: admin.firestore.Timestamp.now() });
}

async function recentSearches(user) {
  const snapshot = await collectionFor(user).orderBy("createdAt", "desc").limit(10).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      criteres: data.criteres,
      createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    };
  });
}

module.exports = { searchCriteria, isSearch, saveSearch, recentSearches };
