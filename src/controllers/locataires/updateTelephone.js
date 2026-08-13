const { admin, db } = require("../../config/firebase")


const verifieTelephone =  async (req,res)=>{
    //recuperation des donnes
    const {idToken,role} = req.body
    if (!idToken || !role) {
        return res.status(400).json({
            success: false,
            msg: "idToken et role requis"
        })
    }

    if (!["locataire", "bailleur"].includes(role)) {
        return res.status(400).json({
            success: false,
            msg: "Role invalide"
        })
    }

    //verification du token
    try{
        const decoded = await admin.auth().verifyIdToken(idToken)
        if(!decoded){
            return res.status(401).json({
                success: false,
                msg: "token invalide"
            })
        }

        //recherche de l'utilisateur a qui apartient le numero de telephone
        const userSnap = await db.collection(role).where("telephone",'==',decoded.phone_number).limit(1).get()
        if(userSnap.empty){

            return res.status(401).json({
                success: false,
                msg: "utilisateur inexistant"
            })
        }
        const user= userSnap.docs[0]
        const userRef = user.ref
        await userRef.update({ "verification.telephoneVerifie": true })

        return res.status(200).json({
            success: true,
            msg: "compte validé"
        })
    
    }
    catch(err){
        console.log("erreur auth telephone : "+err)
        return res.status(500).json({
            success: false,
            msg: "Une erreur est survenue, veuillez réessayer"
        })
    }
}

module.exports ={ verifieTelephone}