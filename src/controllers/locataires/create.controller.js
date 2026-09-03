const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore

//importation des librairie de cryptage des donnees
const bcrypt = require("bcrypt")
const { Locataire } = require("../../models/locataire")
const { verifyGoogleToken } = require("../../services/verifyIdGoogle.service")
const { validatorEmail, validatorPhoneNumber, validatorPassword, validateText } = require("../../utils/validator/validator")
const { createSession } = require("../../services/cookies/cookie.service")
const { supprimerDoublonsNonVerifies } = require("../../services/suppression_doublons.service")


const findLocataireVerifie = async(filter)=>{
    const snap  = await db.collection("locataire").where(filter).get();
    return snap;
}

/**
 * cette function permet d'envoyer un email
 * @param {String} email 
 * @param {String} telephone 
 * @returns 
 */
const envoyerCodeOTP = async (email, telephone) => {
    const body = email ? { email } : { telephone }
    try {
        const response = await fetch(
            `${process.env.BASE_URL}/api/otp/envoieCode/email`,
            {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(body),
            }
        )
        return await response.json()
    } catch (err) {
        console.error("Erreur envoi OTP :", err)
        return { success: false, msg: "Code non envoyé, veuillez réessayer" }
    }
}

const createLocataire = async (req, res) => {
    try {
        // initialisation de donnees lie a la requette
        let { email, telephone, password, idTokenGoogle, photoProfil = null, prenom, nom } = req.body;
        let uidGoogle = null;
        let emailVerifie = false;

        // verification des donnees
        const prenomError = validateText(prenom, { min: 2, max: 128, required: false, fieldName: "prénom" });
        if (prenomError) return res.status(400).json({ success: false, msg: prenomError });

        const nomError = validateText(nom, { min: 2, max: 128, required: false, fieldName: "nom" });
        if (nomError) return res.status(400).json({ success: false, msg: nomError });

        // verification si l'utilisateur utilise l'authentification par google
        const isGoogleSignup = Boolean(idTokenGoogle);
        if (isGoogleSignup) {
            // verification du token google
            const googleDataAuth = await verifyGoogleToken(idTokenGoogle);
            if (!googleDataAuth.success) {
                return res.status(400).json({
                    success: false,
                    msg: googleDataAuth.message ?? "Le token Google est invalide",
                });
            }

            // mise a jour des donnes grace aux donnes venant de google
            const user = googleDataAuth.user;
            email = user.email;
            telephone = user.telephone;
            uidGoogle = user.uidGoogle;
            nom = user.nom;
            prenom = user.prenom;
            photoProfil = user.photoProfil;
            emailVerifie = user.emailVerifie;
        } else {

            // verification de email + telephone et password
            const emailValid = validatorEmail(email);
            const telephoneValid = validatorPhoneNumber(telephone);
            const passwordValid = validatorPassword(password);

            if (!emailValid && !telephoneValid) {
                return res.status(400).json({ success: false, msg: "Ce numéro de téléphone et email sont invalides." });
            }
            if (!passwordValid) {
                return res.status(400).json({
                    success: false,
                    msg: "Le mot de passe doit contenir : 1 majuscule, 1 minuscule, 1 chiffre, 1 symbole et au moins 8 caractères",
                });
            }
        }

        // Normalisation du téléphone AVANT toute recherche/stockage
        if (telephone && !telephone.startsWith("+237")) {
            telephone = `+237${telephone}`;
        }

        // Vérification des doublons (ciblée par type de vérification)
        if (email) {
            const snapEmail = await findLocataireVerifie(
                Filter.and(
                    Filter.where("email", "==", email),
                    Filter.or(
                        Filter.where("verification.emailVerifie", "==", true),
                        Filter.where("verification.telephoneVerifie", "==", true),
                    )
                )
            );
            if (!snapEmail.empty) {
                return res.status(409).json({ success: false, msg: "Cette adresse email est déjà utilisée" });
            }
        }
        if (telephone) {
            const snapTel = await findLocataireVerifie(
                Filter.and(
                    Filter.where("telephone", "==", telephone),
                    Filter.or(
                        Filter.where("verification.telephoneVerifie", "==", true),
                        Filter.where("verification.emailVerifie", "==", true)
                    )
                    
                )
            );
            if (!snapTel.empty) {
                return res.status(409).json({ success: false, msg: "Ce numéro de téléphone est déjà utilisé" });
            }
        }

        // suppression des doublons
        await supprimerDoublonsNonVerifies(email, telephone);
        

        const userData = { email, telephone, photoProfil, prenom, nom, uidGoogle, emailVerifie, password: null };

        if (!uidGoogle) {
            userData.password = await bcrypt.hash(password, Number(process.env.SALTROUND));
            userData.emailVerifie = false;
        }

        // enregistrement de l'utilisateur
        const userdocRef = await db.collection("locataire").add(new Locataire(userData).toFirebase());
        const userId = userdocRef.id;

        

        // creation du cookie de session
        const resultCreatedSession = await createSession(res,userId, "locataire",req)
        if(!resultCreatedSession){
            return res.status(500).json({
                success: false,
                msg: "le serveur a rencontré une erreur inconnue"
            })
        }

        console.log("userid : "+userId)
        // envoie du code OTP
        let otpResult = null;
        if (!userData.emailVerifie) {
            otpResult = await envoyerCodeOTP(email, null);
        }
        console.log("locataire cree: "+userId)
        return res.status(201).json({
            success: true,
            msg: "Compte créé avec succès",
            successSendEmail: otpResult?.success ?? false,
            msgSendEmail: otpResult?.msg ?? "",
        });
        

    } catch (err) {
        console.log("erreur creation locataire : " + err);
        return res.status(500).json({ success: false, msg: "Une erreur est survenue, veuillez réessayer plus tard" });
    }
};

module.exports = {createLocataire}