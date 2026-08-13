const { db, admin} = require("../../config/firebase")
const {Filter} = admin.firestore

const deleteCommentaire = async(req,res)=>{
    try{
        const role =req.role
        const auteurId= req.user.idPublic
        const idPublic = req.params.id

        //recherche du commentaire
        const commentaireRef = await db.collection("commentaire")
        .where(Filter.and(
            Filter.where("idPublic","==",idPublic),
            Filter.where("auteurId","==",auteurId),
            Filter.where("role","==",role)
        )).limit(1).get()

        if(commentaireRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("")
            })
        }
        //supression du commentaire
        await commentaireRef.docs[0].ref.delete()
        const commentaire = commentaireRef.docs[0].data()
        const typeCible = commentaire.typeCible
        const cibleId = commentaire.cibleId
        const annonceRef = db.collection(typeCible).where("idPublic","==",cibleId).limit(1)
        const annonceDoc = (await annonceRef.get()).docs[0]
        const annonce = annonceDoc.data()
        await annonceDoc.ref.update({
            statistiques: {
                ...annonce.statistiques,
                commentaires: Math.max(0,annonce.statistiques.commentaires - 1)
            }
        })

        return res.status(200).json({
            success: true,
            msg : req.t("success.commentaire_deleted",{ns:"responses"})
        })
    }
    catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }

}

module.exports = {deleteCommentaire}