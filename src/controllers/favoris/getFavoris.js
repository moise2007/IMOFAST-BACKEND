const { db, admin } = require("../../config/firebase")
const { Favori } = require("../../models/favoris")
const {Filter} = admin.firestore

const getFavoris = async (req,res)=>{
    try{
        const {page=1,limit=30}= req.query

        const locataireId = req.user.idPublic

        //verification si le bien l'existe pas deja
        const favorisRef= await db.collection("favoris").where(
                Filter.where("locataireId","==",locataireId)
        )
        .limit(30).get()
        let favoris = favorisRef.docs.map(favo => favo.data())

        if(favoris.length > 0){

            // recuperation des annonces
            const annoncesId = favoris.map(fav=>fav.annonceId)
            let annonces= null
            if(annoncesId.length > 0){
                const annonceSnapshot = await db.collection("annonce").where("idPublic","in",annoncesId).get()
                annonces = annonceSnapshot.docs.map(ann=>ann.data())
            }
            

            // recuperation des biens
            const biensId = annonces.map(ann=>ann.bienId)
            let biens = null
            if(biensId.length > 0){
                const bienSnapshot = await db.collection("bien").where("idPublic","in",biensId).get()
                biens = bienSnapshot.docs.map(bien=>bien.data())
            }
            

            if(biens && annonces){
                //chargement des donnes dans les favoris
                favoris = favoris.map(fav=>{
                    const annonce = annonces.find(ann=> ann?.idPublic == fav?.annonceId)
                    const bien = biens.find(bien=>bien?.idPublic == annonce?.bienId)
                    if (!bien || !annonce){
                        return null
                    }
                    return {...fav,bien,annonce}
                })
                favoris = favoris.filter(fav=> fav)
            }
            
        }

        return res.status(200).json({
            success: true,
            total: favoris.length,
            favoris:favoris,
            msg: req.t("success.get_favoris",{ns: "responses"})
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

module.exports = {getFavoris}