const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore

const getContrat = async (req, res) => {
    try {
        let { dateFin, dateDebut, page = 1, limit = 30, bienId, bailleurId, locataireId, statut } = req.query

        const data = { dateFin, dateDebut, page, limit, bienId, bailleurId, locataireId, statut }

        // ── Restriction selon le rôle ─────────────────
        if (req.role == "locataire") {
            delete data.bailleurId
            delete data.bienId
            data.locataireId = req.user.idPublic
        }
        if (req.role == "bailleur") {
            delete data.locataireId
            data.bailleurId = req.user.idPublic
        }

        // Construction de la query 
        let query = db.collection("contrat") 

        if (data?.bienId && data?.bailleurId) {
            query = query.where(
                Filter.and(
                    Filter.where("bailleurId", "==", data.bailleurId),
                    Filter.where("bienId",     "==", data.bienId)
                )
            )
        } else if (data?.bienId) {
            query = query.where("bienId", "==", data.bienId)
        }

        if (data?.bailleurId)   query = query.where("bailleurId",   "==", data.bailleurId)
        if (data?.locataireId)  query = query.where("locataireId",  "==", data.locataireId)
        if (data?.statut)       query = query.where("statut",       "==", data.statut)

        //  Filtre sur les dates
        if (data?.dateDebut) {
            query = query.where("dateDebut", ">=", new Date(data.dateDebut))
        }
        if (data?.dateFin) {
            query = query.where("dateFin", "<=", new Date(data.dateFin))
        }

        // ── Tri + Pagination ──────────────────────────
        query = query.orderBy("createdAt", "desc")
                     .limit(parseInt(data.limit))
                     .offset((parseInt(data.page) - 1) * parseInt(data.limit))

        // ── Exécution ─────────────────────────────────
        const contratRef = await query.get()

        const contrats = contratRef.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        return res.status(200).json({
            success: true,
            data: contrats,
            total: contrats.length,
            pagination: {
                page: parseInt(data.page),
                limit: parseInt(data.limit)
            },
            msg: req.t("success.get_all_contract", { ns: "responses" })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { getContrat }