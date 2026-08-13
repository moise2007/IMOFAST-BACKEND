const { db, admin } = require("../../config/firebase")
const { verifyGoogleToken } = require("../../services/verifyIdGoogle.service")
const { validatorEmail, validatorPhoneNumber } = require("../../utils/validator/validator")
const Filter = admin.firestore
const bcrypt = require("bcrypt")


const deleteBailleur = async(req,res)=>{
   try{
         // recuperer l'email,password ou email seuelement
        const {identifiant,password} = req.body
        const user = req.user


        // rechereche l'email dans la base de donnees
        const isIdentifiantValid = validatorEmail(identifiant) || validatorPhoneNumber(identifiant)
        if(!isIdentifiantValid ||  (user.email !== identifiant && user.telephone !== identifiant) ){
            return res.status(422).json({
                success : false,
                msg: "l'identifiant est invalide"
            })
        }
        
        const userRef = db.collection("bailleur").doc(user.id)
        
        // si l'email n'a pas ete enregistrer pas google ou par facebook
        if(!user.oAuth.uidFacebook && !user.oAuth.uidGoogle){
            // verifier le mot de passe
            const isValidPassword = bcrypt.compare(password,user.password)
            if(!isValidPassword){
                return res.status(409).json({
                    sucess:false,
                    msg: "mot de passe invalide",
                    path:null,
                    redirect:false,
                })
            }
        }
        //supprimer les cookies
        res.clearCookie("token",{
            path: "/"
        })

        //supprimer les session lie a l'utilisateur
        const sessionsRef = await db.collection("session").where("idUser","==",user.id).get()
        if(!sessionsRef.empty){
            const batch = db.batch()
            sessionsRef.docs.forEach(session=>{
                batch.delete(session.ref)
            })
            batch.commit()
        }

        // supprimer l'utilisateur
        await userRef.delete()
        return res.status(200).json({
            sucess:true,
            msg: "notre compte a été suprimé avec succèss",
            path:null,
            redirect:false,
        })
   }catch(err){
        console.log("erreur suppresion bailleur : "+err)
        return res.status(200).json({
            success: false,
            redirect: false,
            path: null,
            msg: "une erreur est survenue cote serveur, veuillez réesayer plustard"
        })
   }


}

module.exports = { deleteBailleur }