const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore

const deleteAnnonceBailleur = async(req,res)=>{
    try{
        const annonceId = req.params.id
        const bailleurId = req.user.idPublic

        // verifie que l'annonce est pour le bailleur
        const annonceDocs = await db.collection("annonce").where(
            Filter.and(
                Filter.where("idPublic","==",annonceId),
                Filter.where("bailleurId","==",bailleurId)
            )
        ).limit(1).get()
        if(annonceDocs.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        await annonceDocs.docs[0].ref.delete()


        // suppresion des candidatures et des favoris de l'annonce
        const queryFavoris = db.collection("favoris").where("annonceId", "==", annonceId)
        const queryCandidature = db.collection("candidature").where("annonceId", "==", annonceId)

        while (true) {
            const favorisSnapshot = await queryFavoris.limit(30).get()
            if (favorisSnapshot.empty) break

            const batchFavoris = db.batch()
            favorisSnapshot.docs.forEach(doc => {
                batchFavoris.delete(doc.ref)
            })
            await batchFavoris.commit()

            if (favorisSnapshot.size < 30) break
        }

        while (true) {
            const candidaturesSnapshot = await queryCandidature.limit(30).get()
            if (candidaturesSnapshot.empty) break

            const batchCandidatures = db.batch()
            candidaturesSnapshot.docs.forEach(doc => {
                batchCandidatures.delete(doc.ref)
            })
            await batchCandidatures.commit()

            if (candidaturesSnapshot.size < 30) break
        }

        

        return res.status(200).json({
            success: true,
            msg: req.t("success.delete_annonce",{ns: "responses"})
        })
    }
    catch(err){
    console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error",{ns: "errors"})
        })
   }
}
module.exports = {deleteAnnonceBailleur}