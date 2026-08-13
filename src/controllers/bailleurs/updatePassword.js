const bcrypt = require("bcrypt")
const { db } = require("../../config/firebase")

const updatePasswordBailleur = async(req,res)=>{
        //recuperer le password actuel et le nouveau
    const {password= "",newPassword} = req.body
    const user = req.user
    
    // si l'email n'a pas ete enregistrer pas google ou par facebook
    if(!user?.oAuth?.uidFacebook && !user?.oAuth?.uidGoogle){
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
    //modifier le mot de passe
    const userRef = await db.collection("bailleur").doc(user.id)
    await userRef.update({
        password: newPassword
    })
    return res.status(200).json({
        sucess:true,
        msg: "mot de passe modifié avec succès",
        path:null,
        redirect:false,
    })
}    

module.exports = { updatePasswordBailleur }