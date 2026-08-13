const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore

const statutsValides = ["planifie", "confirme", "annule", "termine"]

const updateStatutEvenement = async (req, res) => {
    try {
        const idPublic   = req.params.id
        const auteurId = req.user.idPublic
        const { statut } = req.body

        // ── Validation du statut ──────────────────────
        if (!statut || !statutsValides.includes(statut)) {
            return res.status(400).json({
                success: false,
                msg: req.t("invalid_statut_evenement", { ns: "errors" })
            })
        }

        // ── Vérification si l'événement existe ────────
        const evenementRef = await db.collection("evenement")
            .where(Filter.and(
                Filter.where("idPublic",   "==", idPublic),
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

        // ── Mise à jour du statut ─────────────────────
        const evenementDoc = evenementRef.docs[0]
        await db.collection("evenement").doc(evenementDoc.id).update({
            statut,
            updatedAt: new Date()
        })

        return res.status(200).json({
            success: true,
            data: { statut },
            msg: req.t("success.update_status_evenement", { ns: "responses" })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { updateStatutEvenement }