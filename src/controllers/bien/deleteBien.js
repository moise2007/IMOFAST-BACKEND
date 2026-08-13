const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */
const deleteBienBailleur = async(req,res)=>{
    try{
        const idPublic = req.params.id
        const idBailleur  =req.user.idPublic

        // recherche du bien 
        const biendocs = await db.collection("bien")
            .where(Filter.and(
                Filter.where("idPublic","==",idPublic),
                Filter.where("bailleurId","==",idBailleur)
            ))
            .limit(1)
            .get()
        if(biendocs.empty){
            return res.status(409).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        // recherche des annonces
        const annoncesRef = await db.collection("annonces")
        .where(Filter.and(
            Filter.where("bienId","==",idPublic),
            Filter.where("bailleurId","==",idBailleur)
        ))
        .get()

        const annonces = annoncesRef.docs.map(ann=>ann.data())

        // suppresion des favoris des annonces
        for (const annonce of annonces) {
            const queryFavoris = db.collection("favoris").where("annonceId", "==", annonce.idPublic)
            const queryCandidature = db.collection("candidature").where("annonceId", "==", annonce.idPublic)

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

        }
        
        const batch = db.batch()
        annoncesRef.docs.forEach(annonce => {
            batch.delete(annonce.ref)
        })
        batch.delete(biendocs.docs[0].ref)
        await batch.commit()


        return res.status(200).json({
            success: true,
            msg: req.t("success.delete_bien",{ns: "responses"})
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
module.exports = {deleteBienBailleur}