const { db } = require("../../config/firebase")
const bcrypt = require("bcrypt")


/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns 
 */
const updateDataBailleur = async(req,res)=>{
    const user = req.user
    try{
        //netoyage des donnees a modifier
        const {nom=null,prenom=null, photoProfil=null, sexe=null,devise=null,langue=null,password,newPassword, dateNaissance=null } = req.body
        const updateData = {nom,prenom, dateNaissance,sexe,devise,langue,photoProfil}
        Object.keys(updateData).map(k =>{
            if(updateData[k]== null || updateData[k]=="" || `${updateData[k]}`.length < 3){
                delete updateData[k]
            }
        })
        const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^0-9a-zA-Z]).{8,128}$/
        if((password != newPassword && regex.test(password) && regex.test(newPassword))){
            const valid = await bcrypt.compare(password,user.password) || user.uidGoogle
            if(valid){
                updateData.password = await bcrypt.hash(newPassword,process.env.SALTROUND*1)
            }
        }

        if(Object.entries(updateData).length == 0){
            return res.status(200).json({
                success: true,
                msg: "la modification a été éffectuer avec succèss"
            })
        }
        // recuperer les donnes a modifier
        const userdocRef = db.collection("bailleur").doc(user.id)

        // modifier les donnees
        await userdocRef.update(updateData)

        return res.status(200).json({
            success: true,
            msg: "la modification a été éffectuer avec succèss"
        })
    
    }
    catch(err){
        console.log("erreur modification data bailleur : " +err)
        return res.status(500).json({
            success: false,
            msg: "nous avons rencontrés un problème lors de la modification de vos information, veuillez réessayer plus tard"
        })
    }    
}

module.exports = { updateDataBailleur }