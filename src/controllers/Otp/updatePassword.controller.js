const { db, admin } = require("../../config/firebase");
const { sendEmailToAlertError } = require("../../services/sendMailErrorProduction.service");
const { Filter } = admin.firestore;
const TimeStamp = admin.firestore.Timestamp;

const updatePassword  = async(req,res)=>{
    try{
        const {role, password, identifiant} = req.body;

        if(!["bailleur","locataire"].includes(role)){
            return res.status(400).json({
                success: false,
                msg: "le role spécifié est invalide" 
            });
        }
        const passwordValid = validatorPassword(password)
        if(!passwordValid){
            return res.status(400).json({
                success: false,
                msg: "le mot de passe ne corresponds pas aux critères" 
            });
        }

        const userVerifie = await db.collection("identifiantVerifie").where("identifiant","==",identifiant).get()

        if(userVerifie.empty){
            return  res.status(400).json({
                success: false,
                msg: "veulliez verifie votre identifiant a nouveau" 
            });
        }
        const user = userVerifie.docs[0].data()

        if(new Date(user["expireAt"]) < new Date()){
            return res.status(400).json({
                success: false,
                msg: "la session de modification à expirer"
            })
        }

        const passwordHash = await bcrypt.hash(password, Number(process.env.SALTROUND))

        const usersnapShot = await db.collection(role).where(Filter.or(
            Filter.where("email","==",identifiant),
            Filter.where("telephone","==",identifiant)
        )).get()

        if(usersnapShot.empty){
            return res.status(400).json({
                success: false,
                msg: "utilisateur inexistant"
            })
        }
        await userVerifie.docs[0].ref.update({
            password: passwordHash,
            updatedAt: TimeStamp.now()
        })
        return res.status(200).json({
            success: true,
            msg: "mot de passe modifié avec success"
        })
    }
    catch(err){
        console.log("ereur de modification du mot de passe"+err);
        await sendEmailToAlertError({
            title: "ereur de modification du mot de passe",
            error: err,
            req,
        })
        return res.status(500).json({
            success:  false,
            msg: "une erreur est survenue , veulliez réessayez"
        })
    }
}
module.exports = {updatePassword}