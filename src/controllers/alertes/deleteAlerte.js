const { db, admin } = require("../../config/firebase")
const {Filter}  = admin.firestore


async function deleteAlerte(req,res){
    try{
        if(!["mensuel","trimestriel","annuel","aucun"].includes(req.user.forfait.type)){
            const field = {"forfait.type": "aucun"}
            await susprendreCompte(req.user.id,req.role ?? "locataire",field)
            return res.status(203).json({
                success: false,
                msg: ' votre compte a été suspendus pour 7 jours car nous avons répéré uns activité inhabituelle'
            })
        }
        const userId = req.user.idPublic
        const idPublic = req.params.id

        const alertSnapshot = await db.collection("alerte").where(Filter.and(
            Filter.where("idPublic","==",idPublic),
            Filter.where("auteurId","==",userId)
        )).get()

        if(alertSnapshot.empty){
            return res.status(404).json({
                success: false,
                msg: " cette alerte n'existe pas"
            })
        }
        await alertSnapshot.docs[0].ref.delete()
        return res.status(200).json({
            success: true,
            msg: " l'alerte a été supprimé avec succès"
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

module.exports ={deleteAlerte}