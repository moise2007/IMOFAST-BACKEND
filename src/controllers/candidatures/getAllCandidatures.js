const { db, admin } = require("../../config/firebase")
const { Users } = require("../../services/auto/usersGetting")
const { getDocumentsByPublicIds } = require("../../utils/getDocumentsById")
const Timestamp = admin.firestore.Timestamp
const { Filter } = admin.firestore

const getAllCandidature = async (req, res) => {
    try {
        const auteurId = req.user.idPublic
        const { annonceId, type, statut, vu, maxDate, minDate, lastId, pageSize } = req.query

        const taille = 15

        let query = db.collection("candidature")

        if (type && type !== "null" && type !== "undefined")
            query = query.where("type", "==", type)
        if (statut && statut !== "null" && statut !== "undefined")
            query = query.where("statut", "==", statut)
        if (annonceId && annonceId !== "null" && annonceId !== "undefined")
            query = query.where("annonceId", "==", annonceId)
        if (vu && vu !== "null" && vu !== "undefined")
            query = query.where("vu", "==", vu === "true")
        if (maxDate && maxDate !== "null" && maxDate !== "undefined")
            query = query.where("createdAt", "<=", Timestamp.fromDate(new Date(maxDate)))
        if (minDate && minDate !== "null" && minDate !== "undefined")
            query = query.where("createdAt", ">=", Timestamp.fromDate(new Date(minDate)))

        // L'utilisateur ne doit voir QUE ses propres candidatures (en tant que locataire OU bailleur)
        query = query.where(
            Filter.or(
                Filter.where("locataireId", "==", auteurId),
                Filter.where("bailleurId", "==", auteurId)
            )
        )

        // orderBy DOIT être posé avant tout appel à startAfter
        query = query.orderBy("createdAt", "desc")

        const total = (await query.count().get()).data().count

        if (lastId && lastId !== "null") {
            const lastCandidature = await db.collection("candidature")
                .where("idPublic", "==", lastId)
                .limit(1)
                .get()
            if (!lastCandidature.empty) {
                query = query.startAfter(lastCandidature.docs[0])
            }
        }

        const candidatureRef = await query.limit(req.role == "locataire" ? 30: taille).get()
        let candidatures = candidatureRef.docs.map(cand => cand.data())
        candidatures = candidatures.filter(cand=> cand?.delete[auteurId] == false)

        //jointure avec annonce
        const annoncesId = candidatures.map(cand=>cand.annonceId)

        const annonces = await getDocumentsByPublicIds(annoncesId, "annonce")

        //jointure avec le bien
        const biensId = annonces.map(cand=>cand.bienId)

        const biens = await getDocumentsByPublicIds(biensId, "bien")

        const annoncesComplet = annonces.map((ann) => ({
            annonce: ann,
            bien: biens.find((bien) => ann.bienId === bien.idPublic),
        }))

        candidatures = candidatures.map((cand) => ({
            ...cand,
            ...annoncesComplet.find((ann) => cand.annonceId === ann?.annonce?.idPublic),
        }))

        if(req.role == "bailleur"){
            const locataires = Users.COMPTE_CACHE.locataire

            candidatures = candidatures.map(cand=>{
                const locataire = locataires.find(loc=>loc?.idPublic == cand?.locataireId)
                return {...cand,locataire}
            })
        }
        


        return res.status(200).json({
            success: true,
            candidatures,
            hasMore: candidatures.length === taille,
            total,
            msg: req.t("success.get_candidature", { ns: "responses" })
        })
    }
    catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { getAllCandidature }