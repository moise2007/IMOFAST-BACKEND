const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore

const updateContrat = async (req, res) => {
    try {
        const idPublic   = req.params.id
        const bailleurId = req.user.idPublic

        const { dateDebut, dateFin } = req.body

        // ── Vérification si le contrat existe ─────────
        const contratRef = await db.collection("contrat")
            .where(Filter.and(
                Filter.where("idPublic",   "==", idPublic),
                Filter.where("bailleurId", "==", bailleurId)
            ))
            .limit(1)
            .get()

        if (contratRef.empty) {
            return res.status(404).json({
                success: false,
                msg: req.t("error.contract_not_found", { ns: "responses" })
            })
        }

        // ── Construction des champs à modifier ────────
        const dataToUpdate = {
            updatedAt: new Date()
        }

        // On met à jour seulement les champs envoyés
        if (dateDebut) dataToUpdate.dateDebut = new Date(dateDebut)
        if (dateFin)   dataToUpdate.dateFin   = new Date(dateFin)

        // ── Mise à jour ───────────────────────────────
        const contratDoc = contratRef.docs[0]
        await db.collection("contrat").doc(contratDoc.id).update(dataToUpdate)

        // ── Récupération du contrat mis à jour ────────
        const contratUpdated = (await db.collection("contrat").doc(contratDoc.id).get()).data()

        return res.status(200).json({
            success: true,
            data: contratUpdated,
            msg: req.t("success.update_contract", { ns: "responses" })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { updateContrat }