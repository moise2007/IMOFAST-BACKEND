const { db } = require("../../config/firebase")
const { getDocumentsByPublicIds } = require("../../utils/getDocumentsById")

const getProfilBailleur = async (req,res)=>{
    try{
        const id = req.params.id
        const userSnanshot = await db.collection("bailleur")
        .where("idPublic","==",id)
        .get()

        if(userSnanshot.empty){
            return res.status(404).json({
                success: false,
                profil: null,
                hasMore: false,
            })
        }
        const bailleur = userSnanshot.docs[0].data()
        const {nom,prenom,status,emailVerifie,telephoneVerifie,dateNaissance,
            email,telephone, preferences, createdAt, lastConnexion, localisation
        } = bailleur

        return res.status(200).json({
            success: true,
            profil: {nom,prenom,status,emailVerifie,telephoneVerifie,dateNaissance,
            email,telephone, preferences, createdAt, lastConnexion,localisation}
        })


    }catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            hasMore: false,
            msg: " nous avons rencontrez un problème réessayer plustard"
        })
    }
}

module.exports = {getProfilBailleur}