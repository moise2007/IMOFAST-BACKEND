const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore

const getDetailEvenement = async (req, res) => {
    try {
        const idPublic   = req.params.id
        const auteurId = req.user.idPublic

        // ── Récupération de l'événement ───────────────
        const evenementRef = await db.collection("evenement")
            .where(Filter.and(
                Filter.where("idPublic",   "==", idPublic),
                Filter.where("auteurId","==",auteurId)
                
            ))
            .limit(1)
            .get()

        if (evenementRef.empty) {
            return res.status(404).json({
                success: false,
                msg: req.t("evenement_not_found", { ns: "errors" })
            })
        }

        const evenement = evenementRef.docs[0].data()

        return res.status(200).json({
            success: true,
            event: evenement,
            msg: req.t("success.load_one_evenement", { ns: "responses" })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { getDetailEvenement }