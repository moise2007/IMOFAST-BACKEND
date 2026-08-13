const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore

const updateStatutContrat = async (req, res) => {
    try {
        const idPublic = req.params.id
        const bailleurId = req.user.idPublic
        const { statut } = req.body

        // Validation du statut 
        const statutsValides = ["actif", "termine", "resilie"]
        if (!statut || !statutsValides.includes(statut)) {
            return res.status(400).json({
                success: false,
                msg: req.t("invalid_statut", { ns: "errors" })
            })
        }

        //  Vérification si le contrat existe
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
                msg: req.t("success.contract_not_found", { ns: "responses" })
            })
        }

        //  Mise à jour du statut 
        const contratDoc = contratRef.docs[0]
        await db.collection("contrat").doc(contratDoc.id).update({
            statut,
            updatedAt: new Date()
        })

        return res.status(200).json({
            success: true,
            data: { statut },
            msg: req.t("success.update_status_contract", { ns: "responses" })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { updateStatutContrat }