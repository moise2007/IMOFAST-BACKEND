const { admin, db } = require("../../config/firebase");
const {Filter} = admin.firestore;
const TimeStamp = admin.firestore.Timestamp;

const deletebatiment = async(req,res)=>{
    try{
        // recuperation de donnees
        const idPublic =req.params.id;

        if(!idPublic){
            return res.status(404).json({
                success: false,
                msg: "le batiment n'existe plus"
            })
        }

        // recuperation du batiment
        const batimentSnapshot = await db.collection("batiment").where(Filter.and(
            Filter.where("idPublic","==",idPublic),
            Filter.where("bailleurId","==",req.user.idPublic)
        )).limit(1).get()

        if(batimentSnapshot.empty){
            return res.status(404).json({
                success: false,
                msg: "le batiment n'existe plus"
            })    
        }

        // suppresion du batiment
        await batimentSnapshot.docs[0].ref.update({
            delete: true,
            updatedAt: TimeStamp.now()
        });

        return res.status(201).json({
            success: true,
            msg : "batiment supprimé avec succèss",
        });
    }    
    catch(err){
        console.log('erreur de creation du batiment : '+err);
        await sendEmailToAlertError({
            title: "erreur de suppression du batiment",
            error: err,
            req,
        });
        return res.status(500).json({
            success: false,
            msg: "une erreur inconnue s'est produite"
        });
    }
}

module.exports = {deletebatiment};