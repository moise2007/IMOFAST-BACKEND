const { db, admin } = require("../../config/firebase")
const { Users } = require("../../services/auto/usersGetting")
const {Filter} = admin.firestore

const getDetailCandidature = async(req,res)=>{
    try{
        const  idPublic  = req.params.id
        const auteurId= req.user.idPublic

        // verification si le la condidature Existe
        const candidatureRef = await db.collection("candidature")
        .where(
            Filter.and(
                Filter.where("idPublic","==",idPublic),
                Filter.or(
                    Filter.where("locataireId","==",auteurId),
                    Filter.where("bailleurId","==",auteurId)
                )
            )
        )
        .limit(1)
        .get()

        if(candidatureRef.empty){
            return res.status(404).json({
                success: false,
                msg : req.t("error.candidature_not_found",{ns: "responses"})
            })
        }
        const candidature = candidatureRef.docs[0].data()

        let bailleur = null
        // recuperation des donnees bailleurs de l'annonce
        if(req.role == "locataire"){
            const bailleurSnapshot = await db.collection("bailleur")
                .where("idPublic","==",candidature.bailleurId)
                .limit(1).get()
            let {typeProfil="bailleur",nom,prenom,telephone,email,verification,photProfil,idPublic} = bailleurSnapshot.docs[0].data()
            bailleur = {typeProfil,nom,prenom,telephone,email,isVerified: verification.estDigne,photProfil,idPublic}
        }  

        let annonce = null
        // recuperattion de l'annonce
        const annonceSnapshot = await db.collection("annonce")
            .where("idPublic","==",candidature.annonceId)
            .limit(1).get()
        
        if(annonceSnapshot.size == 0){
            annonce = {existe: false}
        }
        else{
            annonce = annonceSnapshot.docs[0].data()
            const bienId = annonce?.bienId

            if(bienId){
                // recuperattion du Bien
                const bienSnapshot = await db.collection("bien")
                    .where("idPublic","==",bienId)
                    .limit(1).get()
                
                if(bienSnapshot.size == 0){
                    annonce = {existe: false}
                }
                else{
                    const bien = bienSnapshot.docs[0].data()
                    annonce = {
                        annonce, 
                        bien
                    }
                }
                
            }
        }
            
            
        let locataire = null
        
        if(req.role == "bailleur"){
            // recuperation de locataire
            locataire = Users.COMPTE_CACHE.locataire.find(loc=>loc?.idPublic == candidature?.locataireId)
            await candidatureRef.docs[0].ref.update({
                updateAt: new Date(),
                vu: true,
                "historique": admin.firestore.FieldValue.arrayUnion({ date: new Date().toISOString(), action: "consulter", type: "info" })
            })
        }

        
        
        

        return res.status(200).json({
            success: true,
            candidature: {...candidature,...(annonce ?? {}),bailleur,locataire},
            msg : req.t("success.loaded_candidature",{ns:"responses"})
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

module.exports = {getDetailCandidature}