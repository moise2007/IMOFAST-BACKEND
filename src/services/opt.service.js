class OTPService {
    static optCode = {};

    static createOTP() {
        let code = Math.floor(Math.random() * 1000000);
        if (code < 100000) code += 100000;
        return code;
    }

    generateOTP(identifiant) {
        const user = OTPService.optCode[identifiant];
        const now = new Date();

        // si utilisateur existe et encore en cooldown
        if (user && now < user.nextAllowedTime) {
            return {
                code: null,
                msg: "Veuillez patienter avant de générer un nouveau code"
            };
        }

        const code = OTPService.createOTP();

        OTPService.optCode[identifiant] = {
            code,
            tentative: 0,
            nextAllowedTime: new Date(Date.now() + 10 * 60 * 1000)
        };
        console.log(OTPService.optCode)
        return {
            code,
            msg: "code généré avec succès"
        };
    }

    verifierCode({ identifiant, code }) {
        const user = OTPService.optCode[identifiant];
        if (!user) {
            return { valid: false, msg: "code inexistant" };
        }

        // reset après 3 tentatives 
        if (user.tentative >= 3) {
            delete OTPService.optCode[identifiant];

            return {
                valid: false,
                msg: "trop de tentatives, veuillez régénérer un code"
            };
        }

        if (user.code == code) {
            delete OTPService.optCode[identifiant];

            return {
                valid: true,
                msg: "code valide"
            };
        }

        user.tentative += 1;

        return {
            valid: false,
            msg: "code invalide"
        };
    }
}

module.exports = {OTPService}