const { createId } = require("@paralleldrive/cuid2");
const { convertirEnFCFA } = require("../utils/devise");
const { Bien } = require("../models/biens");
const { Bureau } = require("../models/bureau");
const { Boutique } = require("../models/Boutique");
const { Terrain } = require("../models/terrain");
const bienRepository = require("../repositories/bien.repository");
const { validateCreateBien, validateUpdateBien, validateBienFilters } = require("../validators/bien.validator");
const { bienCache } = require("../cache/bien.cache");
const { bienListeCache } = require("../cache/bien-liste.cache");
const { bailleurDataCache } = require("../cache/bailleur-data.cache");
const { annonceCache } = require("../cache/annonce.cache");
const { candidatureCache } = require("../cache/candidature.cache");
const { bailleurHomeCache } = require("../cache/bailleur-home.cache");

const LIST_CACHE_TTL = 30_000;

function createServiceError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function invalidateBailleurData(bailleurId) {
  if (bailleurId) {
    bailleurDataCache.deleteItem({ id: bailleurId });
    bailleurHomeCache.deleteItem({ id: bailleurId });
  }
}

function invalidateBienLists() {
  bienListeCache.clear();
}

function cacheBien(record) {
  if (record?.bien?.idPublic) bienCache.setBien(record.bien, record.documentId);
}

async function createBien({ body, bailleurId, t }) {
  const validation = validateCreateBien(body, t);
  if (!validation.valid) throw createServiceError(422, validation.msg);

  const { data } = validation;
  let biens;
  let responseKey = "bien";

  if (validation.type !== "logement") {
    const type = validation.type;
    const TypeModel = type === "bureau" ? Bureau : type === "boutique" ? Boutique : Terrain;
    const categoryData = validation.legacyFlags ? { ...data[type] } : { ...data };
    if (!validation.legacyFlags) {
      const localisation = categoryData.localisation ?? {};
      categoryData.pays ??= localisation.pays;
      categoryData.ville ??= localisation.ville;
      categoryData.quartier ??= localisation.quartier ?? localisation.quatier;
      categoryData.lieuDit ??= localisation.lieuDit ?? localisation.adresse;
      categoryData.lon ??= localisation.lon;
      categoryData.lat ??= localisation.lat;
      if (!Array.isArray(categoryData.photos)) {
        const images = categoryData.images;
        categoryData.photos = Array.isArray(images)
          ? images
          : [images?.imagePrincipale, ...(images?.autres ?? [])].filter(Boolean);
      }
      categoryData.etat ??= "libre";
    }
    categoryData.bailleurId = bailleurId;
    const exemplaires = validation.legacyFlags
      ? categoryData.exemplaires ?? data.exemplaires ?? {}
      : {};
    const idCommun = createId();
    if (validation.legacyFlags) {
      const units = [
        { count: exemplaires.libre ?? exemplaires.disponible, etat: "libre" },
        { count: exemplaires.occuper, etat: "occuper" },
        { count: exemplaires.construction, etat: "construction" },
      ];
      biens = units.flatMap(({ count, etat }) => Array.from({ length: Number(count ?? 0) }, () => (
        new TypeModel({ ...categoryData, etat, idCommun }).toFireBase()
      )));
      responseKey = type;
    } else {
      const count = type === "bureau" ? Number(categoryData.nombreBureaux ?? 1) : 1;
      biens = Array.from({ length: count }, () => new TypeModel({ ...categoryData, etat: categoryData.etat, idCommun }).toFireBase());
    }
  } else {
    const bienData = { ...data, bailleurId, idPublic: createId() };
    if (bienData.prixGoudron) {
      bienData.prixGoudron = convertirEnFCFA(bienData.prixGoudron, bienData.devise ?? "XAF");
    }
    biens = [new Bien(bienData).toFirebase()];
  }

  const createdRecords = await bienRepository.createMany(biens);
  createdRecords.forEach(cacheBien);
  invalidateBienLists();
  invalidateBailleurData(bailleurId);
  if (responseKey === "bien") return { bien: createdRecords[0]?.bien ?? null };
  return { [responseKey]: createdRecords.map((record) => record.bien) };
}

async function getBienByPublicId(idPublic) {
  const result = await bienCache.getOrLoad({
    id: idPublic,
    ttlMs: bienCache.itemTtlMs,
    loader: async () => {
      const record = await bienRepository.findByPublicId(idPublic);
      if (!record) return null;
      bienCache.setDocumentId(idPublic, record.documentId);
      return record.bien;
    },
  });
  return result.success ? result.data : null;
}

function computeStats(biens) {
  const totals = biens.reduce((stats, bien) => {
    const units = bien.exemplaires;
    if (units && typeof units === "object") {
      stats.nombreBiens += Number(units.occuper ?? 0) + Number(units.disponible ?? 0) + Number(units.construction ?? 0);
      stats.nombreBiensOccupes += Number(units.occuper ?? 0);
      stats.nombreBiensVacants += Number(units.disponible ?? 0);
      stats.nombreBiensEnMaintenance += Number(units.construction ?? 0);
    } else {
      stats.nombreBiens += 1;
      if (bien.etat === "occuper") stats.nombreBiensOccupes += 1;
      else if (bien.etat === "construction") stats.nombreBiensEnMaintenance += 1;
      else stats.nombreBiensVacants += 1;
    }
    return stats;
  }, { nombreBiens: 0, nombreBiensEnMaintenance: 0, nombreBiensOccupes: 0, nombreBiensVacants: 0 });

  return {
    ...totals,
    pourcentageBiensVancant: totals.nombreBiens ? (totals.nombreBiensVacants * 100 / totals.nombreBiens).toFixed(2) : "0",
    pourcentageOccupationBiens: totals.nombreBiens ? (totals.nombreBiensOccupes * 100 / totals.nombreBiens).toFixed(2) : "0",
  };
}

async function listBiens(query, { role, user }) {
  const filters = validateBienFilters(query);
  if (role === "bailleur") filters.bailleurId = user.idPublic;
  const cacheKey = JSON.stringify(Object.fromEntries(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b))));
  const result = await bienListeCache.getOrLoad({
    id: cacheKey,
    ttlMs: LIST_CACHE_TTL,
    loader: async () => {
      const records = await bienRepository.list(filters);
      records.forEach(cacheBien);
      const biens = records.map((record) => record.bien);
      return { biens, stats: computeStats(biens) };
    },
  });
  const payload = result.data ?? { biens: [], stats: computeStats([]) };
  return { ...payload, total: payload.biens.length };
}

async function updateBien({ idPublic, bailleurId, body, t }) {
  const validation = validateUpdateBien(body, t);
  if (!validation.valid) throw createServiceError(422, validation.msg);

  const currentBien = await getBienByPublicId(idPublic);
  if (!currentBien || currentBien.bailleurId !== bailleurId) return null;
  const result = await bienRepository.updateByPublicId({
    idPublic,
    bailleurId,
    documentId: bienCache.getDocumentId(idPublic),
    currentBien,
    data: validation.data,
  });
  if (!result) return null;
  bienCache.setBien(result.bien, result.documentId);
  invalidateBienLists();
  invalidateBailleurData(bailleurId);
  return result.bien;
}

async function deleteBien({ idPublic, bailleurId }) {
  const currentBien = await getBienByPublicId(idPublic);
  if (!currentBien || currentBien.bailleurId !== bailleurId) return null;
  const result = await bienRepository.deleteByPublicId({
    idPublic,
    bailleurId,
    documentId: bienCache.getDocumentId(idPublic),
  });
  if (!result) return null;

  bienCache.deleteItem({ id: idPublic });
  const annonceIds = new Set(result.annonces.map((annonce) => annonce.idPublic));
  for (const annonceId of annonceIds) annonceCache.deleteItem({ id: annonceId });
  candidatureCache.deleteWhere((candidature) => annonceIds.has(candidature.annonceId));
  invalidateBienLists();
  invalidateBailleurData(bailleurId);
  return result;
}

function invalidateBailleurDataCache(idPublic) {
  invalidateBailleurData(idPublic);
}

module.exports = {
  createBien,
  getBienByPublicId,
  listBiens,
  updateBien,
  deleteBien,
  invalidateBailleurDataCache,
};
