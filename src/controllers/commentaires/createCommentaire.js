const {  db, admin } = require("../../config/firebase")
const {createId} = require("@paralleldrive/cuid2")
const { Commentaire } = require("../../models/commentaire")

const createCommentaire = async(req,res)=>{
    try{
        const  idPublic  = createId()
        const auteurId= req.user.idPublic
        const role = req.role
        const { cibleId, typeCible, message, nom,prenom,photoProfil } = req.body

        if(!["profil","locataire","annonce","bien","bailleur"].includes(typeCible)){
            return res.status(409).json({
                success: false,
                msg: req.t("missing_fields",{ns: "responses",fields : "le type"})
            })
        }
        if(message.length == 0){
            return res.status(409).json({
                success: false,
                msg: req.t("missing_fields",{ns: "responses",fields :"contenu du commentairre"})
            })
        }
        // creation du commentaire
        const commentaireFirebase = new Commentaire({auteurId,role,cibleId,idPublic,typeCible,message, nom, prenom, photoProfil})
        .toFirebase()
        const commentaireRef = await db.collection("commentaire")
        .add(commentaireFirebase)

        const commentaire= (await commentaireRef.get()).data()

        if(typeCible == "annonce"){
            const annonceRef = db.collection(typeCible).where("idPublic","==",cibleId).limit(1)
            const annonceDoc = (await annonceRef.get()).docs[0]
            const annonce = annonceDoc.data()
            await annonceDoc.ref.update({
                "statistiques.commentaires":admin.firestore.FieldValue.increment(1 )
            })
        }

        return res.status(200).json({
            success: true,
            commentaire,
            msg : req.t("success.commentaire_created",{ns:"responses"})
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

module.exports = {createCommentaire}