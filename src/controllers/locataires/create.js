const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore

//importation des librairie de cryptage des donnees
const bcrypt = require("bcrypt")
const { Locataire } = require("../../models/locataire")
const { generateTokenSession } = require("../../services/tokenSession")
const { verifyGoogleToken } = require("../../services/verifyIdGoogle.service")
const { validatorEmail, validatorPhoneNumber } = require("../../utils/validator/validator")


// function de creation du token en suite du cookie
const setCookieSession = (res, sessionId) => {
    const token  = generateTokenSession(sessionId)
    const signed = process.env.COOKIE_SECURE !== "false"
    res.cookie("token", token, {
        httpOnly: true,
        secure:   signed,
        sameSite: signed ? "none" : "Lax",
        path:     "/",
        signed,
        maxAge:   365 * 24 * 3600000,
    })
}


//function de creationde la session dans firebase
const createSession = async (res, userId) => {
    const now      = new Date()
    const expireAt = new Date()
    expireAt.setMonth(now.getMonth() + 12)

    const sessionRef = await db.collection("session").add({
        userId,
        createAt: now,
        expireAt,
    })
    setCookieSession(res, sessionRef.id)
}




const findLocataireVerifie = async (filter) => {
    const snap = await db.collection("locataire").where(filter).get()
    return snap
}

/**
 * cette function permet de supprimer les doublons
 */
const supprimerDoublonsNonVerifies = async (email, telephone) => {
    const filters = []

    if (email) {
        filters.push(Filter.and(
            Filter.where("email", "==", email),
            Filter.where("verification.emailVerifie","==", false),
            Filter.where("verification.telephoneVerifie","==", false),
        ))
    }
    if (telephone) {
        filters.push(Filter.and(
            Filter.where("telephone", "==", "+237"+telephone),
            Filter.where("verification.emailVerifie", "==", false),
            Filter.where("verification.telephoneVerifie","==", false),
        ))
    }

    if (filters.length === 0) return

    const snap = await db.collection("locataire")
        .where(filters.length === 1 ? filters[0] : Filter.or(...filters))
        .get()

    if (snap.empty) return

    const batch = db.batch()
    snap.forEach(doc => batch.delete(doc.ref))
    await batch.commit()
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

const createLocataire = async(req,res)=>{
   try{

        // recuperation des identifiants (idTokenGoogle, email, telephone)
        let {email,telephone,password,idTokenGoogle,photoProfil=null,prederences=null,nom='',prenom=null} = req.body

        //verification du token google
        let uGoogle = null
        if(idTokenGoogle && idTokenGoogle?.trim() !== ""){
            uGoogle =  await verifyGoogleToken(idTokenGoogle)
            if(!uGoogle){
                return res.status(401).json({
                    success: true,
                    msg: "Token Google invalide"
                })
            }
            email = uGoogle?.email ?? email
        }

        // verrification des identifiants
        const  telephoneIsValid  =  telephone ? validatorPhoneNumber(telephone) : false
        const  emailIsValid = validatorEmail(email)
        if(!emailIsValid && !telephoneIsValid){
            return res.status(400).json({
                success: false,
                msg: !emailIsValid ?  " Addresse email est invalide" : "numéro de téléphone invalide"
            })
        }
        
        
        // recuperation des donnees de l'utilisateurs
        const userData = {...req.body}

        // recherhce si utilisateur existe et email ou telephone verifier
        // si utlisateur existe et que l'email ou le telephone 
        // n'est pas verifié alors ge recrée un cette utilisateur

        if(emailIsValid){
            const filterEmail = uGoogle
            ? Filter.and(
                Filter.where("uidGoogle", "==",uGoogle.uidGoogle),
                Filter.or(
                    Filter.where("verification.emailVerifie","==",true),
                    Filter.where("verification.telephoneVerifie","==",true)
                )
            )
            :
             Filter.and(
                Filter.where("email", "==",email),
                Filter.or(
                    Filter.where("verification.emailVerifie","==",true),
                    Filter.where("verification.telephoneVerifie","==",true)
                )
            )
            const snapEmail = await findLocataireVerifie(filterEmail)
            console.log("ok")
            if(!snapEmail.empty){
                return res.status(409).json({
                    success: false,
                    msg:"Cette adresse email est déjà utilisée"
                })
            }
        }
        if(telephoneIsValid){
            const snapTel = await findLocataireVerifie (
                Filter.and(
                    Filter.where("telephone", "==","+237"+telephone),
                    Filter.or(
                        Filter.where("verification.emailVerifie","==",true),
                        Filter.where("verification.telephoneVerifie","==",true)
                    )
                )
            )
            if(!snapTel.empty){
                return res.status(409).json({
                    success: false,
                    msg: "Ce numéro de téléphone est déjà utilisé"
                })
            }
        }

        //suppresison des doublons non verifier
        await supprimerDoublonsNonVerifies(emailIsValid ? email : null, telephoneIsValid ? telephone : null)


        // hashage du password et construction des donnees
        if(!uGoogle){
            const hashPassword = await bcrypt.hash(password,process.env.SALTROUND*1)
            userData.password = hashPassword
            userData.emailVerifie = false
        }else{
            userData.uidGoogle = uGoogle?.uidGoogle
            userData.telephone =  telephone
            userData.email =  email
            userData.emailVerifie = uGoogle?.emailVerifie || false
            userData.photoProfil = photoProfil
        }


        userData.telephone = (userData.telephone && userData.telephone.startsWith("+237")) ? userData.telephone : `+237${userData.telephone}`
        // creation de l'utilisateur dans la base de donnees
        const userdocRef = await db.collection("locataire").add(new Locataire(userData).toFirebase())
        const userId = userdocRef.id

        // creation de la de la session (id + idSession)
        await createSession(res,userId)
        let otpResult = null
        if( !userData.emailVerifie && emailIsValid){
            otpResult = await envoyerCodeOTP(emailIsValid ? email : null, !emailIsValid ? telephone :null)
            console.log(otpResult)
        }
        return res.status(201).json({
            success:true,
            msg: "Compte créé avec succès",
            successSendEmail: otpResult?.success ?? null,
            msgSendEmail: otpResult?.msg ?? null,
        })
        
    }
    catch(err){
        console.log("erreur creation locataire : "+err)
        return res.status(500).json({
            success:false,
            msg: "Une erreur est survenue, veuillez réessayer plus tard"
        })
    }
}

module.exports = {createLocataire}