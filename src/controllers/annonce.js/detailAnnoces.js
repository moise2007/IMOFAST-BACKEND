const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore

const detailAnnonce = async(req,res)=>{
    try{
        const annonceId = req.params.id

        const annonceDocs = await db.collection("annonce")
        .where("idPublic","==",annonceId)
        .limit(1)
        .get()

        if(annonceDocs.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }
        const annonce = annonceDocs.docs[0].data()


        const bienId = annonce.bienId
        const bienRef = await db.collection("bien").where("idPublic","==",bienId).limit(1).get()
        const bien = bienRef.docs[0].data() ?? {}

        let bailleur = null
        let annoncesSimilaires = null


        // verification si favoris
        let favoris = {idPublic:null}
        if(req.role && req.role != "bailleur"){
            const snapShotFavoris = await db.collection("favoris")
            .where(Filter.and(
                Filter.where("annonceId","==",annonce.idPublic),
                Filter.where("locataireId","==",req?.user?.idPublic)
            ))
            .limit(1).get()
            if(snapShotFavoris.size>0){
                favoris = {idPublic: snapShotFavoris.docs[0].data().idPublic}
            }
        }   

        if(req.role && req.role != "bailleur"){


            const bailleurRef = await db.collection("bailleur").where("idPublic","==",annonce.bailleurId).limit(1).get()
            bailleur = bailleurRef.docs[0].data() ?? null

            // // recherche des annonces similaire
            // const type = bien?.type
            // const nature = bien?.nature
            // const ville = bien?.localisation?.ville
            // const prixMax = annonce?.loyer[0].prix
            // const bailleurId = annonce?.bailleurId
            // const natureAnnonce = annonce?.nature

            // let query =  db.collection("bien")
            // query = query.where("type","==",type)
            // query = query.where("nature","==",nature)

            // query = query
            // .orderBy("localisation.ville")
            // .startAt(ville)
            // .endAt(ville+ "\uf8ff")


            // const bienSnapshot = await query.limit(10).get()

            // if(bienSnapshot.size > 0){
            //     const idBiens = bienSnapshot.docs.map(b=>b?.idPublic)
            // }


        }
        return res.status(200).json({
            success: true,
            annonce: {...annonce,bien,bailleur,favoris},
            msg: req.t("success.load_one_annonce",{ns: "responses"})
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
module.exports = {detailAnnonce}