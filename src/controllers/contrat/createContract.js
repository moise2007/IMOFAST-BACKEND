const {createId} = require("@paralleldrive/cuid2")
const { db, admin } = require("../../config/firebase")
const Contrat = require("../../models/contract")
const {Filter} = admin.firestore

const createContrat = async(req,res)=>{
    try{
        const { locataireId, bienId, dateDebut, dateFin } =req.body

        const bailleurId = req.user.idPubblic
        const idPublic = createId()

        //verification si le locataire existe
        const locartaireRef = await db.collection("locataire")
        .where("idPublic","==",idPublic)
        .limit(1)
        .get()

        //verification si le bien est celui du bailleur
        const bienRef = await db.collection("bien")
        .where(Filter.and(
            Filter.where("bailleurId","==",bailleurId),
            Filter.where("idPublic","==",bienId)
        ))
        .limit(1)
        .get()

        //verification si le bien a un contract actif
        const contratExiste = await db.collection("contrat")
        .where(Filter.and(
            Filter.where("bienId","==",bienId),
            Filter.where("bailleurId","==",bailleurId),
            Filter.where("statut","==","actif")
        ))
        .limit(1)
        .get()

        if(!contratExiste.empty){
            return res.status(403).json({
                success: false,
                msg: req.t("error.bien_already_contract",{ns: "responses"})
            })
        }

        if(bienRef.empty){
            return res.json({
                success: true,
                msg: req.t("error.bien_not_found",{ns: "responses"})
            })
        }

        if(locartaireRef.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("error.locataire_not_found", { ns: "responses" })
            })
        }

        //creation du contract
        const contratFireBase = new Contrat({bailleurId,idPublic,dateFin,dateDebut,locataireId})
        .toFirebase()

        const contratRef = await db.collection("contrat").add(contratFireBase)
        const contrat = (await contratRef.get()).data()

        return res.status(200).json({
            success: true,
            contrat,
            msg : req.t("success.create_contract", { ns: "responses" })
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
module.exports = {createContrat}