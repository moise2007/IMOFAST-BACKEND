const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore

const deleteEvenement = async (req, res) => {
    try {
        const idPublic  = req.params.id
        const auteurId = req.user.idPublic

        // ── Vérification si l'événement existe ────────
        const evenementRef = await db.collection("evenement")
            .where(Filter.and(
                Filter.where("idPublic",  "==", idPublic),
                Filter.where("auteurId", "==", auteurId)
            ))
            .limit(1)
            .get()

        if (evenementRef.empty) {
            return res.status(404).json({
                success: false,
                msg: req.t("evenement_not_found", { ns: "errors" })
            })
        }

        // ── Suppression ───────────────────────────────
        const evenementDoc = evenementRef.docs[0]
        await db.collection("evenement").doc(evenementDoc.id).delete()

        return res.status(200).json({
            success: true,
            msg: req.t("success.delete_evenement", { ns: "responses" })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { deleteEvenement }