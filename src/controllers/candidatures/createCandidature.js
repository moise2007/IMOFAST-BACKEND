const {createId} = require("@paralleldrive/cuid2")
const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore
const {Candidature} = require("../../models/candidature")
const { susprendreCompte } = require("../../services/suspensionCompte")
const  Timestamp =  admin.firestore.Timestamp

const createCandidature = async(req,res)=>{
    try{
        if(!["mensuel","trimestriel","annuel","aucun"].includes(req.user.forfait.type)){
            const field = {"forfait.type": "aucun"}
            await susprendreCompte(req.user.id,req.role ?? "locataire",field)
            return res.status(203).json({
                success: false,
                msg: ' votre compte a été suspendus pour 7 jours car nous avons répéré uns activité inhabituelle'
            })
        }
        console.log(req.body)
        const {  type,  message, visite, demande,
            annonceId } = req.body

        const idPublic = createId()
        //verifiation si le bailleur Existe
        const annnonceSnapshot = await db.collection("annonce")
        .where("idPublic","==",annonceId).limit(1).get()
        if(annnonceSnapshot.empty){
            return res.status(400).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }
        await annnonceSnapshot.docs[0].ref.update({
            [`statistiques.candidatures`]: admin.firestore.FieldValue.increment(1)
        })

        const annonce = annnonceSnapshot.docs[0].data()
        const bailleurId = annonce.bailleurId

        const locataireId = req.user.idPublic
        // verification si le la condidature Existe
        const candidatureExisteRef = await db.collection("candidature")
        .where(
            Filter.and(
                Filter.where("annonceId","==",annonceId),
                Filter.where("locataireId","==",locataireId),
                Filter.where("statut", "==","en_attente"),
            )
        )
        .limit(1)
        .get()
        

        if(!candidatureExisteRef.empty){
            await candidatureExisteRef.docs[0].ref.update({
                updateAt: Timestamp.now(),
                statut: "annuler"
            })
        }

        //creationn de la candidature
        const candidatureFireBase = new Candidature({idPublic,bailleurId,locataireId,type,statut: "en_attente",
            vu: false, message, visite,demande,annonceId
        }).toFirebase()
        
        
        // verification du forfait locataire et du nombre de candidature restante
        if(!["mensuel","trimestriel","annuel","aucun"].includes(req.user.forfait.type) || ( req.user.forfait.type =="aucun"  || new Date() > new Date(req.user.forfaite?.fin?._seconds*1000) ) && (req.user.candidatures?.candidaturesRestantes != null && req.user.candidatures?.candidaturesRestantes <= 0)){
            return res.status(200).json({
                success: false,
                candidature:null,
                forfait: true,
                msg : "veuillez souscrire à un forfait pour pouvoir faire des candidatures."
            })
        }
        

        // creation de la candidature
        await db.collection("candidature").add(candidatureFireBase)
        // enregistrement de la candidature dans le locataire
        if(!["mensuel","trimestriel","annuel"].includes(req.user.forfait.type) || new Date() > new Date(req.user.forfaite?.fin?._seconds*1000)){
            await db.collection("locataire").doc(req.user.id).update({
                ["candidatures.candidaturesRestantes"] : admin.firestore.FieldValue.increment(-1)
            })
        }

        

        return res.status(200).json({
            success: true,
            candidature: candidatureFireBase,
            msg : req.t("success.candidature_created",{ns:"responses"})
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

module.exports = {createCandidature}