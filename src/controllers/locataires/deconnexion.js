const { db } = require("../../config/firebase")

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */
const deconnexionLocataire = async(req,res)=>{
    try{
        // recuperer l'id de la session et supprimer la session
        const session = await db.collection("session").doc(req.sessionId).delete()
        

        // vider les cookies
        res.clearCookie("token");
        return res.status(200).json({
            success:true,
            msg: "la deconnexion a reussi"
        })
    }catch(err){
        console.log(err)
        return res.status(500).json({
            success:false,
            msg: "Une erreur est survenue, veuillez réessayer plus tard"
        })
    }
    
}
module.exports = { deconnexionLocataire}