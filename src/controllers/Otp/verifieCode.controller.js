const { admin, db } = require("../../config/firebase")
const { OTPService } = require("../../services/opt.service")
const { validatorEmail, validatorPhoneNumber } = require("../../utils/validator/validator")
const { Filter } = admin.firestore

const verifieCode = async(identifiant, newIdentifant, code, role,res )=>{
    try{
        // verification des identifiants
        const isEmail = validatorEmail(identifiant);
        const isTelephone = validatorPhoneNumber(identifiant);

        if(!isEmail && !isTelephone){
            return res.status(422).json({
                success: false,
                msg: `${!isEmail ? "email ": "telephone "} invalide`
            })
        }
        // verification du code
        const otpservice = new OTPService()
        const response = otpservice.verifierCode({identifiant: newIdentifant ?? identifiant, code})
        if(!response.valid){
            return res.status(400).json({
                success: false,
                msg: response.msg
            })
        }

        // verification de l'existence de l'utilisateur
        const userDoc  = await db.collection(role).where(Filter.or(
            Filter.where("email", "==",identifiant),
            Filter.where("telephone","==",identifiant)
        )).get()

        if(userDoc.empty){
            return res.status(400).json({
                success: false,
                msg: "utilisateur introuvable"
            })
        }
        const id = userDoc.docs[0].id
        await db.collection(role).doc(id).update(
            {[`verification.${isEmail ? "emailVerifie": "telephoneVerifie"}`]: true}
        )

        //etablissement des delai
        const dateActuel = new Date()
        const dateExpiration = new Date()
        dateExpiration.setMinutes(dateActuel.getMinutes() + 10)

        // garder dans "identifiantVerifie" pour les mots de passe oublie ou le changement d'identifiant
        const doublonsExist = await db.collection("identifiantVerifie").where("identifant","==",newIdentifant ?? identifiant).get()
        if(!doublonsExist.empty){
            const batch = db.batch()
            doublonsExist.docs.forEach(doc=>{
                batch.delete(doc)
            })
            await batch.commit()
        }
        await db.collection("identifiantVerifie").add({
            identifiant : identifiant,
            expireAt: dateExpiration,
            createAt: dateActuel,
        })

        return res.status(200).json({
            success: true,
            msg: response.msg
        })

        
    }
    catch(err){
        console.log(`une erreur est survenue lors de la varification de l'email : ${err}`)
        return res.status(500).json({
            success: false,
            msg: "erreur est survenue lors de la verification du code veuillez réessayer"
        })
    }
}
module.exports = {verifieCode}