const { sendEmail } = require("../../services/mail.service");
const { OTPService } = require("../../services/opt.service");
const { validatorEmail, validatorPhoneNumber } = require("../../utils/validator/validator")

const sendCode = async(identifiant,res)=>{
    try{
        let isEmail = validatorEmail(identifiant);
        let isTelephone = validatorPhoneNumber(identifiant);


        if(!isEmail && !isTelephone){
            return res.status(400).json({
                success: false,
                msg: "les identifiants sont invalides"
            })
        }

        // generation du code de verification 
        const Otpservice = new OTPService()
        const responseCode = Otpservice.generateOTP(identifiant)
        const code = responseCode.code

        // envoie du code
        if(isEmail){
            const data = await sendEmail(identifiant, code)
            return res.status(data?.success ? 200 : 400).json(data)
        }
        else{
            console.log("telephone: "+code)
            return res.status(200).json({
                success: true,
                msg: "le code envoyé avec success"
            })
        }
    }
    catch(err){
        return res.status(400).json({
            success: false,
            msg: "une erreur inconnue est survenue"
        })
    }
}


module.exports = {sendCode}