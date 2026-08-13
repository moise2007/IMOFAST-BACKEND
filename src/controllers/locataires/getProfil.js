const { db } = require("../../config/firebase")

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */
const getProfilLocataire = async(req,res)=>{
    try{
        const id = req.params.id
        console.log(id)
        const userSnanshot = await db.collection("locataire")
        .where("idPublic","==",id)
        .get()

        if(userSnanshot.empty){
            return res.status(404).json({
                success: false,
                profil: null
            })
        }
        const locataire = userSnanshot.docs[0].data()
        const {nom,prenom,status,emailVerifie,telephoneVerifie,dateNaissance,
            email,telephone, preferences, createdAt, lastConnexion
        } = locataire
        return res.status(200).json({
            success: true,
            profil: {nom,prenom,status,emailVerifie,telephoneVerifie,dateNaissance,
            email,telephone, preferences, createdAt, lastConnexion}
        })


    }catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: " nous avons rencontrez un problème réessayer plustard"
        })
    }
    
}
module.exports = { getProfilLocataire}