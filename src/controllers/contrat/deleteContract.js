const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore

const deleteContrat = async (req, res) => {
    try {
        const idPublic   = req.params.id
        const bailleurId = req.user.idPublic

        // Vérification si le contrat existe 
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

        // suppression
        const contratDoc = contratRef.docs[0]
        await db.collection("contrat").doc(contratDoc.id).delete()

        return res.status(200).json({
            success: true,
            msg: req.t("success.delete_contract", { ns: "responses" })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { deleteContrat }