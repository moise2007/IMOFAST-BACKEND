const { db, admin } = require("../../config/firebase")
const { getDocumentsByPublicIds } = require("../../utils/getDocumentsById")

const PAGE_SIZE = 15

// Normalise pour une comparaison texte robuste (casse + accents)
function normaliserTexte(texte = "") {
    return texte
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // retire les accents
        .trim()
}

function retirerSuspendues(annonces) {
    return annonces.filter((ann) => ann?.status !== "suspendue")
}

async function incrementerVues(annonces) {
    if (annonces.length === 0) return
    const bulkWriter = db.bulkWriter()
    annonces.forEach((annonce) => {
        bulkWriter.update(db.collection("annonce").doc(annonce.id), {
            "statistiques.vues": admin.firestore.FieldValue.increment(1),
        })
    })
    await bulkWriter.close()
}

// Jointure bien + bailleur (factorisée, elle était dupliquée à plusieurs endroits)
async function joindreBienEtBailleur(annonces, role) {
    const idPublisBien = annonces.map((a) => a?.bienId).filter(Boolean)
    const biens = await getDocumentsByPublicIds(idPublisBien, "bien")

    let result = annonces.map((ann) => ({
        ...ann,
        bien: biens.find((b) => b.idPublic === ann.bienId),
    }))

    if (role !== "bailleur") {
        const idPublicsBailleur = result.map((a) => a?.bailleurId).filter(Boolean)
        const bailleurs = await getDocumentsByPublicIds(idPublicsBailleur, "bailleur")
        result = result.map((ann) => ({
            ...ann,
            bailleur: bailleurs.find((b) => b.idPublic === ann.bailleurId),
        }))
    }
    return result
}

// Récupère TOUTES les annonces d'un bailleur, en plusieurs requêtes paginées
// (jamais une seule grosse requête, même s'il y a 1000 annonces).
async function getToutesAnnoncesBailleur(bailleurId, tailleLot = 300) {
    let toutes = []
    let curseur = null

    while (true) {
        let q = db.collection("annonce")
            .where("bailleurId", "==", bailleurId)
            .orderBy("createdAt", "desc")
            .limit(tailleLot)

        if (curseur) q = q.startAfter(curseur)

        const snap = await q.get()
        if (snap.empty) break

        toutes = toutes.concat(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        curseur = snap.docs[snap.docs.length - 1]

        if (snap.docs.length < tailleLot) break // plus rien à charger côté serveur
    }

    return toutes
}

const getAllAnnonce = async (req, res) => {
    try {
        const {
            bienId, bailleurId, maxPrix, minPrix, populaire, natureAnnonce,
            estPubliee, superficie, nature, type, ville, quartier,
            niveau, nombreChambre, nombreSalleBain, createAt,
            camera, barriere, wifi, televiseur, parking, lastId,
            piscine, ascenseur, refrigerateur, cuisine, etageMax, hopital,
            ecole, marche, mode, isSearch = false, text
        } = req.query
        console.log(req.query)

        // Requête "vide" = aucun filtre explicite fourni par le client
        const aucunFiltre = ![
            bienId, bailleurId, maxPrix, minPrix, superficie, nature, type,
            ville, quartier, niveau, nombreChambre, nombreSalleBain,
            camera, barriere, wifi, televiseur, parking, piscine, ascenseur,
            refrigerateur, cuisine, etageMax, hopital, ecole, marche, mode, text
        ].some((v) => v !== undefined && v !== "")

        // ------------------------------------------------------------
        // Aucun filtre => flux personnalisé selon le rôle (locataire /
        // bailleur / visiteur)
        // ------------------------------------------------------------
        if (aucunFiltre) {
            return await handleDefaultFeed(req, res)
        }

        // ------------------------------------------------------------
        // Flux normal (avec filtres)
        // ------------------------------------------------------------

        // ÉTAPE 1 — Filtrer les biens
        let queryBien = db.collection("bien")

        if (bailleurId) queryBien = queryBien.where("bailleurId", "==", bailleurId)
        if (nature) queryBien = queryBien.where("nature", "==", nature)
        if (mode) queryBien = queryBien.where("mode", "==", mode)
        if (niveau) queryBien = queryBien.where("niveauFinition", "==", niveau)

        if (ville) {
            const premiereVille = ville.split(" ")[0]?.toLowerCase()
            queryBien = queryBien.where("motCles", "array-contains", premiereVille)
        }
        if (quartier) queryBien = queryBien.where("localisation.quartier", "==", quartier)

        if (nombreChambre) queryBien = queryBien.where("chambres.nombre", "==", parseInt(nombreChambre))
        if (nombreSalleBain) queryBien = queryBien.where("salleBains.nombre", "==", parseInt(nombreSalleBain))

        // Un seul champ avec inégalité côté Firestore (superficie).
        // etageMax est filtré en mémoire plus bas : Firestore ne permet
        // pas d'inégalité sur 2 champs différents dans la même requête.
        if (superficie) queryBien = queryBien.where("superficie", ">=", parseInt(superficie))

        if (wifi) queryBien = queryBien.where("equipements.wifi", "==", wifi === "true")
        if (televiseur) queryBien = queryBien.where("equipements.televiseur", "==", televiseur === "true")
        if (parking) queryBien = queryBien.where("equipements.parking", "==", parking === "true")
        if (piscine) queryBien = queryBien.where("equipements.piscine", "==", piscine === "true")
        if (ascenseur) queryBien = queryBien.where("equipements.ascenseur", "==", ascenseur === "true")
        if (refrigerateur) queryBien = queryBien.where("equipements.refrigerateur", "==", refrigerateur === "true")
        if (cuisine) queryBien = queryBien.where("equipements.cuisineEquipee", "==", cuisine === "true")

        if (camera) queryBien = queryBien.where("securite.camera", "==", camera === "true")
        if (barriere) queryBien = queryBien.where("securite.barriere", "==", barriere === "true")

        if (hopital) queryBien = queryBien.where("environements.hopital", "==", hopital === "true")
        if (ecole) queryBien = queryBien.where("environements.ecole", "==", ecole === "true")
        if (marche) queryBien = queryBien.where("environements.marche", "==", marche === "true")

        // BUG : c'était "= 1" -> une seule propriété récupérée, tout le
        // filtrage devenait inutile. On reprend la valeur suggérée en commentaire.
        const limiteBien = text ? 300 : 100
        const snapshotBien = await queryBien.limit(limiteBien).get()

        let biendocs = snapshotBien.docs.map((b) => b.data())

        if (type) {
            const types = type.split(" ")
            biendocs = biendocs.filter((bien) => types.includes(bien?.type))
        }
        if (etageMax) {
            biendocs = biendocs.filter((bien) => (bien?.etage?.max ?? Infinity) <= parseInt(etageMax))
        }

        let bienIds = biendocs.map((doc) => doc.idPublic)

        if (bienIds.length === 0) {
            return res.status(200).json({
                success: true,
                msg: req.t("success.get_all_annonce", { ns: "responses" }),
                annonces: [],
                total: 0,
                hasMore: false,
            })
        }

        // ÉTAPE 2 — Filtrer les annonces
        let queryAnnonce = db.collection("annonce")

        // BUG : un "==" et un "in" sur le même champ "bienId" dans la même
        // requête faisait planter Firestore. On priorise bienId si fourni.
        if (bienId) {
            queryAnnonce = queryAnnonce.where("bienId", "==", bienId)
        } else {
            // NB : "in" est limité à 30 valeurs par Firestore, au-delà les
            // biens excédentaires sont ignorés (limitation connue, non résolue ici).
            queryAnnonce = queryAnnonce.where("bienId", "in", bienIds.slice(0, 30))
        }
        if(natureAnnonce) queryAnnonce = queryAnnonce.where("nature", "==", natureAnnonce)

        if (bailleurId) queryAnnonce = queryAnnonce.where("bailleurId", "==", bailleurId)

        if (populaire === "true") {
            queryAnnonce = queryAnnonce.orderBy("statistiques.vues", "desc")
        } else {
            queryAnnonce = queryAnnonce.orderBy("createdAt", "desc")
        }

        if (lastId && lastId !== "null") {
            const lastSnap = await db.collection("annonce").where("idPublic", "==", lastId).limit(1).get()
            if (!lastSnap.empty) {
                queryAnnonce = queryAnnonce.startAfter(lastSnap.docs[0])
            }
        }

        const limiteFetch = text ? 200 : PAGE_SIZE
        queryAnnonce = queryAnnonce.limit(limiteFetch)

        const snapshotAnnonce = await queryAnnonce.get()
        let annonces = snapshotAnnonce.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

        // BUG : "recherche.minPrix" vs "rechercher.maxPrix" (faute de frappe,
        // champ inexistant -> filtre ignoré silencieusement). En plus, deux
        // inégalités sur 2 champs différents + un orderBy sur un 3e champ
        // (createdAt / vues) n'est pas supporté par Firestore : on filtre
        // donc le prix en mémoire, après récupération.
        if (minPrix) {
            annonces = annonces.filter((a) => (a?.recherche?.minPrix ?? 0) >= parseInt(minPrix))
        }
        if (maxPrix) {
            annonces = annonces.filter((a) => (a?.recherche?.maxPrix ?? Infinity) <= parseInt(maxPrix))
        }

        // On retire les suspendues AVANT le top-up et AVANT le slice, sinon
        // le total de la page pouvait être < 15 sans raison, et on
        // incrémentait les vues d'annonces suspendues.
        annonces = retirerSuspendues(annonces)

        // Top-up : désactivé aussi en recherche texte (résultats non pertinents sinon)
        if (annonces.length < PAGE_SIZE && req.role !== "bailleur" && isSearch !== "true" && !text) {
            const reste = PAGE_SIZE - annonces.length
            const idDejaPresents = annonces.map((a) => a.idPublic).filter(Boolean)

            // BUG : "not-in" est limité à 10 valeurs par Firestore -> plantait
            // dès qu'on avait déjà récupéré plus de 10 annonces. On sur-fetch
            // puis on filtre en mémoire à la place.
            const resteSnapShot = await db.collection("annonce")
                .where("status","!=","suspendus")
                .orderBy("createdAt", "desc")
                .orderBy("statistiques.vues","desc")
                .orderBy("metaData.note","desc")
                .limit(reste + idDejaPresents.length)
                .get()

            const complement = resteSnapShot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((a) => !idDejaPresents.includes(a.idPublic) && a?.status !== "suspendue")
                .slice(0, reste)

            annonces = annonces.concat(complement)
        }

        // Jointure avec le bien et le bailleur
        annonces = await joindreBienEtBailleur(annonces, req.role)

        // RECHERCHE TEXTE
        if (text) {
            // 1. Normaliser puis découper le texte de recherche en mots
            const mots = normaliserTexte(text)
            .split(" ")
            .map((mot) => mot.replace(/[^a-zA-Z]/g, "")) // retire tout sauf les lettres
            .filter((mot) => mot.length >= 3) // retire les mots trop courts
            if (mots.length > 0) {
                annonces = annonces.filter((ann) => {
                    const champs = [
                        ann.titre,
                        ann.bien?.motCles,
                        ann.recherche?.motCles,
                        ann.description,
                        ann.bien?.description,
                        ann.bien?.localisation?.ville,
                        ann.bien?.localisation?.quartier,
                    ]
                        .filter(Boolean)
                        .map(normaliserTexte)
                        .join(" ")

                    const motsTrouves = mots.filter((mot) => champs.includes(mot)).length

                    return motsTrouves >= Math.ceil(mots.length / 2)
                })
            }
        }

        // BUG : "hasMore: annonces.length >= 1" était toujours vrai dès qu'il
        // y avait 1 résultat. On compare au contraire à la taille de page.
        const hasMore = annonces.length > PAGE_SIZE
        annonces = annonces.slice(0, PAGE_SIZE)

        if (annonces.length > 0 && req.role !== "bailleur") {
            await incrementerVues(annonces)
        }

        const dernierIdPublic = annonces.length > 0 ? annonces[annonces.length - 1].idPublic : null

        annonces.forEach((ann) => {
            delete ann.id
        })

        return res.status(200).json({
            success: true,
            msg: req.t("success.get_all_annonce", { ns: "responses" }),
            annonces,
            total: annonces.length,
            hasMore,
            lastId: dernierIdPublic,
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            annonces: [],
            msg: req.t("server_error", { ns: "errors" }),
        })
    }
}

// ==================================================================
// Flux "aucun filtre" : personnalisé selon le rôle de l'utilisateur
// ==================================================================
async function handleDefaultFeed(req, res) {
    const { lastId } = req.query

    // ---------------- BAILLEUR : toutes ses annonces, par lots ----------------
    if (req.role === "bailleur") {
        // Hypothèse : req.user.idPublic correspond au champ "bailleurId" des annonces
        const bailleurId = req.user?.idPublic

        let toutes = await getToutesAnnoncesBailleur(bailleurId)
        toutes = retirerSuspendues(toutes)

        let curseurIndex = 0
        if (lastId && lastId !== "null") {
            const idx = toutes.findIndex((a) => a.idPublic === lastId)
            if (idx !== -1) curseurIndex = idx + 1
        }

        let page = toutes.slice(curseurIndex, curseurIndex + PAGE_SIZE)
        const hasMore = curseurIndex + PAGE_SIZE < toutes.length

        page = await joindreBienEtBailleur(page, req.role)

        const dernierIdPublic = page.length > 0 ? page[page.length - 1].idPublic : null
        page.forEach((ann) => delete ann.id)

        return res.status(200).json({
            success: true,
            msg: req.t("success.get_all_annonce", { ns: "responses" }),
            annonces: page,
            total: page.length,
            hasMore,
            lastId: dernierIdPublic,
        })
    }

    // ---------------- LOCATAIRE : recommandations selon préférences ----------------
    if (req.role === "locataire") {
        // Hypothèse : req.user.preferences = { typeLogement, maxBudget, quartier }
        const preferences = req.user?.preferences || {}
        const { typeLogement, maxBudget, quartier } = preferences

        // On récupère un lot large des annonces les plus récentes (non
        // suspendues), puis on classe/filtre en mémoire selon les
        // préférences (les combiner directement en requêtes Firestore
        // n'est pas possible : trop de champs différents en inégalité/égalité
        // pour une seule requête indexée).
        const snap = await db.collection("annonce")
            .where("status","!=","suspendus")
            .orderBy("createdAt", "desc")
            .orderBy("statistiques.vues","desc")
            .orderBy("metaData.note","desc")
            
            
            .limit(200)
            .get()

        let pool = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        pool = retirerSuspendues(pool)
        pool = await joindreBienEtBailleur(pool, req.role)

        const correspondType = (ann) => !typeLogement || ann.bien?.type === typeLogement
        const correspondPrecis = (ann) => {
            const matchBudget = !maxBudget || (ann.recherche?.maxPrix ?? Infinity) <= parseInt(maxBudget)
            const matchQuartier = !quartier || normaliserTexte(ann.bien?.localisation?.quartier) === normaliserTexte(quartier)
            return correspondType(ann) && matchBudget && matchQuartier
        }

        // 1) Correspondance stricte à toutes les préférences
        let resultats = pool.filter(correspondPrecis)
        const totalDisponible = pool.length

        // 2) Pas assez de résultats précis et il existe d'autres annonces
        // dans le pool -> on complète avec les plus récentes qui matchent
        // au moins le type de logement.
        if (resultats.length < PAGE_SIZE && resultats.length < totalDisponible) {
            const idDejaPresents = resultats.map((a) => a.idPublic)
            const complementType = pool
                .filter((a) => !idDejaPresents.includes(a.idPublic) && correspondType(a))
                .slice(0, PAGE_SIZE - resultats.length)

            resultats = resultats.concat(complementType)
        }

        // 3) Toujours pas assez -> on complète avec les plus récentes, sans condition.
        if (resultats.length < PAGE_SIZE) {
            const idDejaPresents = resultats.map((a) => a.idPublic)
            const complementRecent = pool
                .filter((a) => !idDejaPresents.includes(a.idPublic))
                .slice(0, PAGE_SIZE - resultats.length)

            resultats = resultats.concat(complementRecent)
        }

        const hasMore = totalDisponible > resultats.length
        resultats = resultats.slice(0, PAGE_SIZE)

        if (resultats.length > 0) {
            await incrementerVues(resultats)
        }

        const dernierIdPublic = resultats.length > 0 ? resultats[resultats.length - 1].idPublic : null
        resultats.forEach((ann) => delete ann.id)

        return res.status(200).json({
            success: true,
            msg: req.t("success.get_all_annonce", { ns: "responses" }),
            annonces: resultats,
            total: resultats.length,
            hasMore,
            lastId: dernierIdPublic,
        })
    }

    // ---------------- VISITEUR : annonces les plus populaires ----------------
    let queryVisiteur = db.collection("annonce").orderBy("statistiques.vues", "desc")

    if (lastId && lastId !== "null") {
        const lastSnap = await db.collection("annonce").where("idPublic", "==", lastId).limit(1).get()
        if (!lastSnap.empty) {
            queryVisiteur = queryVisiteur.startAfter(lastSnap.docs[0])
        }
    }

    // On récupère 1 de plus que la page pour savoir s'il reste des résultats
    queryVisiteur = queryVisiteur.limit(PAGE_SIZE + 1)

    const snapshot = await queryVisiteur.get()
    let annonces = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    annonces = retirerSuspendues(annonces)

    const hasMore = annonces.length > PAGE_SIZE
    annonces = annonces.slice(0, PAGE_SIZE)

    annonces = await joindreBienEtBailleur(annonces, req.role)

    if (annonces.length > 0) {
        await incrementerVues(annonces)
    }

    const dernierIdPublic = annonces.length > 0 ? annonces[annonces.length - 1].idPublic : null
    annonces.forEach((ann) => delete ann.id)

    return res.status(200).json({
        success: true,
        msg: req.t("success.get_all_annonce", { ns: "responses" }),
        annonces,
        total: annonces.length,
        hasMore,
        lastId: dernierIdPublic,
    })
}

module.exports = { getAllAnnonce }