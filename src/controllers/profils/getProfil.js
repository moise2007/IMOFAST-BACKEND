const { db } = require("../../config/firebase")


const getProfil = async(req,res)=>{
    try{
        const {idPublic,role} = req.body

        if(!["bailleur","locataire"].includes(role)){
            return res.json({
                success: false,
                msg: req.t("unauthorized",{ns: "errors"})
            })
        }

        const profilDoc = await db.collection(role)
        .where("idPublic","==",idPublic)
        .limit(1)
        .get()

        if(profilDoc.empty){
            return res.status(404).json({
                success: false,
                msg: req.t("not_found",{ns: "erros"})
            })
        }
        const profil = profilDoc.docs[0].data()
        return res.status(200).json({
            success: true,
            profil: profil,
            msg: req.t("success.get_profil",{ns: "responses"})
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

module.exports = {getProfil}