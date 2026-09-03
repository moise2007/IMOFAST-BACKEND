const { sendEmail } = require("../../services/mail.service");
const { OTPService } = require("../../services/opt.service");
const { validatorEmail, validatorPhoneNumber } = require("../../utils/validator/validator")

const sendCode = async(identifiant)=>{
    try{
            let isEmail = validatorEmail(identifiant);
        let isTelephone = validatorPhoneNumber(identifiant);

        if(!isEmail && !isTelephone){
            return {
                success: false,
                msg: "les identifiants sont invalides"
            }
        }

        // generation du code de verification 
        const Otpservice = new OTPService()
        const responseCode = Otpservice.generateOTP(identifiant)
        const code = responseCode.code

        // envoie du code
        if(isEmail){
            const data = await sendEmail(identifiant, code)
            return data
        }
        else{
            console.log("telephone: "+code)
            return {
                success: true,
                msg: "le code envoyé avec success"
            }
        }
    }
    catch(err){
        return {
            success: false,
            msg: "une erreur inconnue est survenue"
        }
    }
}

const verifieCode = async(identifiant,code)=>{

}

module.exports = {sendCode}