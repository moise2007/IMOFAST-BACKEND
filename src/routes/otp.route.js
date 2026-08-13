
const express = require("express")
const { sendEmail } = require("../services/mail.service")
const { OTPService } = require("../services/opt.service")
const { db, admin } = require("../config/firebase")
const {sendOTP} = require("../config/termii")
const { verifieTelephone } = require("../controllers/locataires/updateTelephone")
const routerOTP = express.Router()


// verification de l'email
routerOTP.post("/verifie-email/code/:role",async(req,res)=>{
    try{
        const role  = req.params.role
        const {code,email,newEmail=null} = req.body
        console.log(req.body)
        const otpservice = new OTPService()
        const response = otpservice.verifierCode({identifiant: newEmail ?? email, code})
        if(!response.valid){
            return res.status(500).json({
                success: false,
                msg: response.msg
            })
        }

        const userDoc  = await db.collection(role).where("email","==",email).get()
        if(userDoc.empty){
            return res.status(409).json({
                success: false,
                redirect: false,
                path:null,
                msg: "utilisateur introuvable"
            })
        }
        const id = userDoc.docs[0].id
        await db.collection(role).doc(id).update({"verification.emailVerifie": true})

        const dateActuel = new Date()
        const dateExpiration = new Date()
        dateExpiration.setMinutes(dateActuel.getMinutes() + 10)

        //mettre l'email dans la collection de email verifie pour que 
        // les utilisateurs soit obliger de verifier l'email
        const doublonsExist = await db.collection("identifiantVerifie").where("identifant","==",newEmail ?? email).get()
        if(!doublonsExist.empty){
            const batch = db.batch()
            doublonsExist.docs.forEach(doc=>{
                batch.delete(doc)
            })
            batch.commit()
        }
        await db.collection("identifiantVerifie").add({
            identifiant : email,
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
})

// verification du telephone


//envoie de du code par email

routerOTP.post("/envoieCode/email",async(req,res)=>{
    const {email} = req.body

    if(!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)){
        return res.status(200).json(
            {
                success:false,
                msg:"email invalide !"
            }
        )
    }
    const Otpservice = new OTPService()
    const responseCode = Otpservice.generateOTP(email)
    const code = responseCode.code
    
    if(code){
        const data = await sendEmail(email,code)
        if(data.success){
            return res.status(200).json({
                ...data
            }) 
        }
        return res.status(400).json({
            ...data
        })
    }
    else{
        return res.status(500).json(
            {
                success:false,
                msg:"mail non envoyé, veuillez réessayer !"
            }
        )
    }
})


//envoie du code par sms
routerOTP.post("/envoieCode/sms",async(req,res)=>{
    try {
    const { telephone } = req.body;

    // Validation numéro camerounais
    if (!telephone || !telephone.startsWith("237") || telephone.length !== 12) {
      return res.status(400).json({ 
        success: false,
        msg: `Numéro invalide. Format attendu : ${telephone}` 
      });
    }

    await sendOTP(telephone)
    res.json({ msg: "Code envoyé avec succès" ,success: true});

  } catch (error) {
    console.log(error)
    res.status(500).json({ msg: "Erreur envoi OTP", error: error.message ,success: false});
  }
})

routerOTP.post('/verifieTelephone',verifieTelephone)


module.exports = {routerOTP}