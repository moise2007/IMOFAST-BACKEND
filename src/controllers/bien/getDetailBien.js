const { db } = require("../../config/firebase")

const getDetailBien = async(req,res)=>{
    try{
        const id = req.params.id
        const bienDocs = await db.collection("bien").where("idPublic","==",id).limit(1).get()
        if(bienDocs.empty){
            return res.status(400).json({
                success: false,
                msg: req.t("not_found",{ns: "errors"})
            })
        }

        return res.status(200).json({
            success: true,
            msg: req.t("success.load_one_bien" ,{ns: "responses"}),
            bien: bienDocs.docs[0].data()
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
module.exports = {getDetailBien}
