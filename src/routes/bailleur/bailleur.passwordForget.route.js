
const express = require("express")
const { OTPService } = require("../../services/opt.service")
const { db, admin } = require("../../config/firebase")

const Filter = admin.firestore

const routerPasswordForgetBailleur = express.Router()

routerPasswordForgetBailleur.post("/send-code/email",async(req,res)=>{
    const {email} = req.body
    const otp = new OTPService()
    const code = otp.generateOTP()
    const transporteur = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });
    // configuration du message 
    const mailOptions = {
        from: `"ImoFast" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "inscripton sur ImoFast",
        html:`<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 0;">

        <!-- Conteneur principal -->
        <table width="600" cellpadding="0" cellspacing="0" 
               style="background-color: #ffffff; border-radius: 10px; padding: 40px;">
          
          <!-- Logo / Titre -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h1 style="color: #1a1a2e; font-family: Arial, sans-serif;">
                Imo<span style="color: #0066ff;">Fast</span>
              </h1>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td align="center" style="font-family: Arial, sans-serif; color: #333;">
              <p>Suite à votre demande d'inscription sur la plateforme <b>ImoFast</b>,
              nous vous envoyons ce code afin de vérifier votre identité.</p>
            </td>
          </tr>

          <!-- Code OTP -->
          <tr>
            <td align="center" style="padding: 30px 0;">
              <div style="background-color: #f0f4ff; border-radius: 8px; padding: 20px 40px; display: inline-block;">
                <h1 style="color: #0066ff; font-family: Arial, sans-serif; 
                           font-size: 42px; letter-spacing: 8px; margin: 0;">
                  ${code}
                </h1>
              </div>
            </td>
          </tr>

          <!-- Avertissement -->
          <tr>
            <td align="center" style="font-family: Arial, sans-serif; color: #888; font-size: 13px;">
              <p>Ce code est valable <b>10 minutes</b>.</p>
              <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 30px; border-top: 1px solid #eee; 
                                       font-family: Arial, sans-serif; color: #aaa; font-size: 12px;">
              <p>© 2026 ImoFast Cameroun — Tous droits réservés</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
    }
    try{
        const info = await transporteur.sendMail(mailOptions);
        console.log('mail envoyé : ' , info.messageId)
        return ({success:true,msg:"mail envoyé avec success"})
      }
    catch(err){
        console.log("erreur envoie email "+err)
      }
      return ({success:false,msg:"mail envoyé non envoyé, veuillez réessayer !"})
    
})


routerPasswordForgetBailleur.post("/verify-code",async(req,res)=>{
    //recuperer les donnes
    const {identifiant ,code} = req.body
    const otp = new OTPService()

    // verifier le code
    const isValidCode = otp.verifierCode({identifiant:identifiant,code:code})

    if(isValidCode.valid){
        const dateActuel = new Date()
        const dateExpiration = new Date()
        dateExpiration.setMinutes(dateActuel.getMinutes() + 10)
        const compteRef = await db.collection("CompteVerifieForget").add({
            identifiant:identifiant,
            createAt: dateActuel,
            expireAt: dateExpiration,
        })

        return res.status(200).json({
            success: true,
            redirect: false,
            path:null,
            mdg: isValidCode.msg
        })
    }
    return res.status(500).json({
        success: false,
        redirect: false,
        path:null,
        msg: isValidCode.msg
    })
    
})

routerPasswordForgetBailleur.post("/updatePassword/:role",async(req,res)=>{
    // recuperer le passsword et l'email
    const {identifiant,password} = req.body
    const role = req.params.role

    //verifier si email est dans "CompteVerifieForget" SINON STOP
    const users =await db.collection("CompteVerifieForget")
    .where("identifiant","==",identifiant).get()

    if(users.empty){
        return res.status(400).json({
            success: false,
            redirect: false,
            path:null,
            msg: "veulliez d'abord identifier votre compte par mail/sms"
        })
    }

    // veriffeir si le delai est depasser
    const userVer = {...users.docs[0].data()}
    if(new Date(userVer.expireAt) > new Date()){
        return res.status(400).json({
            success: false,
            redirect: false,
            path:null,
            msg: "veulliez réessayer plus tard, car le delai a expiré"
        })
    }

    const batch = db.batch()
    users.docs.forEach(doc =>{
        batch.delete(doc.ref)
    })
    batch.commit()


    //recherche de l'utilisateur dans la collection locataire
    const user = db.collection(role)
    .where(Filter.or(
        Filter.where("email","==",identifiant),
        Filter.where("telephone","==",identifiant)
    ))
    .limit(1).get()

    //modification du mot de passse
    await users.docs[0].ref.update({password})

    //creer la session 
})
module.exports = {routerPasswordForgetBailleur}