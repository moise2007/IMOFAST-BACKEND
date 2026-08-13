const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore

const approveContrat = async (req, res) => {
    try {
        const idPublic = req.params.id
        const locataireId = req.user.idPublic
        let {isProuved} =req.body

        if(typeof isProuved !== "boolean"){
            isProuved = true
        }

        // Vérification si le contrat existe 
        const contratRef = await db.collection("contrat")
            .where(Filter.and(
                Filter.where("idPublic", "==", idPublic),
                Filter.where("locataireId", "==", locataireId)
            ))
            .limit(1)
            .get()

        if (contratRef.empty) {
            return res.status(404).json({
                success: false,
                msg: req.t("error.contract_not_found", { ns: "responses" })
            })
        }

        const contratDoc  = contratRef.docs[0]
        const contratData = contratDoc.data()

        // Vérification si déjà accepté 
        if (contratData.confirm.locataire === true) {
            return res.status(400).json({
                success: false,
                msg: req.t("error.contract_already_approved", { ns: "responses" })
            })
        }

        // Acceptation du contrat 
        await db.collection("contrat").doc(contratDoc.id).update({
            "confirm.locataire": true,
            updatedAt: new Date()
        })

        return res.status(200).json({
            success: isProuved,
            msg: req.t("success.approve_contract", { ns: "responses" })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { approveContrat }