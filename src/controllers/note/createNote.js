const {createId} = require("@paralleldrive/cuid2")
const { db } = require("../../config/firebase")
const { Note } = require("../../models/notes")

const createNote = async(req,res)=>{

    try{
        //recuperation des valeurs
        const {cibleId, typeCible, valeur,} = req.body
        const idPublic = createId()
        const auteurId = req.user.idPublic

        // verification du type de la cible
        if(!["profil","bailleur","locataire","bien","annonce"].includes(typeCible)){
            return res.status(409).json({
                success: false,
                msg: req.t("cible_not_found",{ns: "errors"})
            })
        }

        // validation valeur (note)
        if (!valeur || valeur < 0 || valeur > 5) {
        return res.status(400).json({
            success: false,
            msg: req.t("error_note" ,{ns: "errors"}),
        });
        }

        //creation de la note
        const noteFireBase = new Note({cibleId, typeCible, valeur,idPublic,auteurId}).toFirebase()
        const noteDocs = await db.collection("note").add(noteFireBase)

        // retouner la response 
        return res.status(200).json({
            success: true,
            msg: req.t("success.create_note",{ns: "responses"})
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

module.exports = {createNote}