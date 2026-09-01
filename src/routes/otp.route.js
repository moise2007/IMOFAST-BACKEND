
const express = require("express")
const { sendEmail } = require("../services/mail.service")
const { OTPService } = require("../services/opt.service")
const { db, admin } = require("../config/firebase")
const {Filter } =admin.firestore
const {sendOTP} = require("../config/termii")
const { verifieTelephone } = require("../controllers/locataires/updateTelephone")
const { validatorEmail, validatorPhoneNumber, validatorPassword } = require("../utils/validator/validator")
const bcrypt = require("bcrypt")
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
            return res.status(200).json({
                success: false,
                msg: response.msg
            })
        }

        const userDoc  = await db.collection(role).where("email","==",email).get()
        if(userDoc.empty){
            return res.status(200).json({
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

routerOTP.patch("update-password",async(req,res)=>{
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
        await userVerifie.docs[0].ref.update({password: passwordHash})
        return res.status(200).json({
            success: true,
            msg: "mot de passe modifié avec success"
        })
    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            success:  false,
            msg: "une erreur est survenue , veulliez réessayez"
        })
    }
})

const AllowsCollections = ["bailleur","locataire"]
routerOTP.post("/update-identifiant/:collection",async(req, res)=> {
  try {
    // reucperattion des donnes
    const { collection } = req.params;
    const { email, telephone, lastEmail, lastTelephone } = req.body;
    console.log(req.body)
    // verification de la collection
    if (!collection || !AllowsCollections.includes(collection))
      return res.status(200).json({ success: false, message: "une erreur c'est produite , veuillez réessayez plustard" });

    // verifeication des identifiant
    const data = {};
    if (email?.trim()) {
        data.email = email.trim().toLowerCase()
        data["verification.emailVerifie"] = false
    }
    if (telephone?.trim()) {
        data.telephone = telephone.replace(/\s/g, "")
        data["verification.telephoneVerifie"] = false
    }
    if (!Object.keys(data).length || !(validatorEmail(data?.email) || validatorPhoneNumber(data?.telephone)))
      return res.status(200).json({ success: false, message: "l'identifiant est invalide" });

    // verification des doubons
    console.log(data)
    const doublons = await db.collection(collection).where(Filter.or(
        data?.email 
        ? Filter.and(
            Filter.where("email","==",data.email),
            Filter.or(
                Filter.where("verification.emailVerifie","==",true),
                Filter.where("verification.telephoneVerifie","==",true),
            )
        )
        :Filter.and(
            Filter.where("telephone","==",data.telephone),
            Filter.or(
                Filter.where("verification.emailVerifie","==",true),
                Filter.where("verification.telephoneVerifie","==",true),
            )
        )
    )).get()

    if(!doublons.empty){
        return res.status(200).json({
            success: false,
            msg: "cet identifiant exite déjà"
        })
    }

    await db.collection(collection)
    .where( data.email ? Filter.where("email","==", lastEmail) : Filter.where("telephone","==", lastTelephone))
    .get().then(doc => {
        if(doc.empty){
            return res.status(200).json({
                success: false,
                msg: "une erreur inconnue s'est produite"
            })
        }
        doc.docs[0].ref .update({...data})
    })
    

    return res.status(200).json({
      success: true,
      message: "Contact modifié avec succès",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la modification"
    });
  }
})


//envoie de du code par email

routerOTP.post("/envoieCode/email",async(req,res)=>{
    const {email} = req.body

    if(!validatorEmail(email)){
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
        return res.status(200).json({
            ...data,
            success: false
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