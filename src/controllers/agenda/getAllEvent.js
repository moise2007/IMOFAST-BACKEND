const { db, admin } = require("../../config/firebase")

const getAllEvenement = async (req, res) => {
    try {
        const { type, statut, bienId, start, end, page = 1, limit = 30 } = req.query
        const auteurId = req.user.idPublic

        // ── Construction de la query ──────────────────
        let query = db.collection("evenement")
            .where("auteurId", "==", auteurId)

        // ── Filtres ───────────────────────────────────
        if (type)        query = query.where("type",        "==", type)
        if (statut)      query = query.where("statut",      "==", statut)
        if (bienId)      query = query.where("bienId",      "==", bienId)
        if (auteurId) query = query.where("auteurId", "==", auteurId)

        // ── Filtre sur les dates ──────────────────────
        if (start) query = query.where("start", ">=", new Date(start))
        if (end)   query = query.where("start", "<=", new Date(end))

        // ── Tri + Pagination ──────────────────────────
        query = query
            .orderBy("start", "asc")
            .limit(parseInt(limit))
            .offset((parseInt(page) - 1) * parseInt(limit))

        const snapshot = await query.get()

        const evenements = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))

        return res.status(200).json({
            success: true,
            events: evenements,
            total: evenements.length,
            pagination: {
                page:  parseInt(page),
                limit: parseInt(limit)
            },
            msg: req.t("success.get_all_evenement", { ns: "responses" })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { getAllEvenement }