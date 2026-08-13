const {createId} = require("@paralleldrive/cuid2")
const { db, admin } = require("../../config/firebase")
const { Favori } = require("../../models/favoris")
const {Filter} = admin.firestore

const createFavoris = async (req,res)=>{
    try{
        const annonceId = req.params.id

        const locataireId = req.user.idPublic
        const idPublic = createId()

        //verification sit l'annonce existe
        const annonceSnapshot = await db.collection("annonce").where("idPublic","==",annonceId).limit(1).get()
        if(annonceSnapshot.size == 0){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        await annonceSnapshot.docs[0].ref.update({
            [`statistiques.favoris`]: admin.firestore.FieldValue.increment(1)
        })

        //verification si le annonce l'existe pas deja
        const favorisExiste = await db.collection("favoris").where(
            Filter.and(
                Filter.where("annonceId","==",annonceId),
                Filter.where("locataireId","==",locataireId)
            )
        )
        .limit(1).get()

        if(!favorisExiste.empty){
            return res.status(402).json({
                success: false,
                msg: req.t("already_favori",{ns: "errors"})
            })
        }

        const favorisFirebase = new Favori({locataireId,idPublic,annonceId}).toFirebase()
        const favoris = (await (await db.collection("favoris").add(favorisFirebase)).get()).data()

        return res.status(200).json({
            success: true,
            msg: req.t("success.add_favori",{ns: "responses"}),
            favoris
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

module.exports = {createFavoris}