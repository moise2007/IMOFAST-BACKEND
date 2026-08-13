const {createId} = require("@paralleldrive/cuid2")
const { db, admin } = require("../../config/firebase")
const { Note } = require("../../models/notes")
const {Filter} = admin.firestore

const updateNote = async(req,res)=>{

    try{
        //recuperation des valeurs
        const { valeur} = req.body
        const  idPublic = req.params.id
        const auteurId = req.user.idPublic

        //recuperation de le la note
        const noteDocs = await db.collection("note").where(
            Filter.and(
                Filter.where("auteurId","==",auteurId),
                Filter.where("idPublic","==",idPublic)
            )
        )
        .limit(1)
        .get()

        if(noteDocs.empty){
            return res.status(409).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }
        await noteDocs.docs[0].ref.update({valeur: Math.max(0,Math.min(5,valeur))})

        // retouner la response 
        return res.status(200).json({
            success: true,
            msg: req.t("success.update_note",{ns: "responses"})
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

module.exports = {updateNote}