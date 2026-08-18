const { verifyGoogleToken } = require("../../services/verifyIdGoogle.service")
const {verifyFacebookToken} = require("../../services/verifyIdFacebook.service")
const { db, admin } = require("../../config/firebase")
const { validatorEmail, validatorPhoneNumber, validatorPassword } = require("../../utils/validator/validator")
const {Filter} = admin.firestore
const {Bailleur} = require("../../models/bailleur")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { generateTokenSession } = require("../../services/tokenSession")
const { CompletudeProfilBailleur } = require("../../services/notation/completudeBailleur")

// Réponses locales à ce contrôleur (le middleware n'est pas modifié).
// Le shape "fetchApi/path" reprend volontairement celui utilisé par
// createAuthMiddleware quand il bloque un compte non vérifié, pour que le
// front puisse traiter les deux cas (blocage à la connexion / juste après
// l'inscription) avec le même code.
const REPONSE_ERREUR_SERVEUR = {
    success: false,
    msg: "Une erreur est survenue, veuillez réessayer plus tard"
}
const compteNonVerifie = (path) => ({
    fetchApi: true,
    path,
})

// function de creation du token en suite du cookie
const setCookieSession = (res, sessionId) => {
    const token  = generateTokenSession(sessionId)
    const isProd = process.env.ETAT === "production"
    res.cookie("token", token, {
        httpOnly: true,
        domain: isProd ? ".imofast.org" : undefined,
        secure:   isProd,
        sameSite: isProd ? "none" : "lax",
        signed: true,
        path:     "/",
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
/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @returns {Object}
 */

const createBailleur = async(req,res)=>{
    try{
        const dateActuel = new Date()
        const dateExpiration = new Date()
        dateExpiration.setMonth(dateActuel.getMonth() + 12)
        // recuperation des donnees
        let {
            nom, email=null, prenom=null, telephone=null, password=null, photoProfil=null,typeProfil='bailleur',
            dateNaissance = null, localisation= null, idTokenGoogle, cni = {}, imageAnciensContrats = [],
        } = req.body

        let user,idUser,uGoogle
        //traitement avec les uid 
        if(idTokenGoogle){
            uGoogle = await verifyGoogleToken(idTokenGoogle)
            // BUG corrigé : avant, ce bloc était dans un "else if(uGoogle)" qui
            // ne s'exécutait jamais (uGoogle valait encore undefined à ce stade).
            // Résultat : en connexion Google, l'email vérifié du compte Google
            // n'était jamais repris -> le champ "email" restait celui (souvent
            // vide) envoyé par le front.
            email = uGoogle?.email
            password = null
        }
        else{
            if(!validatorEmail(email) && email !== "" ){
                return res.status(400).json({
                    success: false,
                    msg:"l'email que vous avez fournir n'est pas valide",
                    redirect: false,
                    path:null
                })
            }
            else if((!validatorPhoneNumber(telephone)  && email == "" )){
                return res.status(400).json({
                    success: false,
                    msg:"le numéro de téléphone que vous avez fournir n'est pas valide",
                    redirect: false,
                    path:null
                })
            }
            if(validatorPassword(password))
                password = await bcrypt.hash(password,process.env.SALTROUND*1);
            else{
                return res.status(400).json({
                    success: false,
                    msg:"mot de passe invalide",
                    redirect: false,
                    path:null
                })
            }
                
        }
        const userIdGoogle =  uGoogle?.uidGoogle ? uGoogle?.uidGoogle: null
        

        // recuperation de utilisateur ayant les memes identifants
        // Guard: build only the branches where the identifier is actually provided
        const orFilters = [];

        if (uGoogle) {
            orFilters.push(
                Filter.and(
                    Filter.where("oAuth.uidGoogle", "==", userIdGoogle),
                    Filter.or(
                        Filter.where("verification.emailVerifie", "==", true),
                        Filter.where("verification.telephoneVerifie", "==", true), // fixed typo
                    )
                )
            );
        }


        if (email) {
            orFilters.push(
                Filter.and(
                    Filter.where("email", "==", email),
                    Filter.or(
                        Filter.where("verification.emailVerifie", "==", true),
                        Filter.where("verification.telephoneVerifie", "==", true),
                    )
                )
            );
        }

        if (telephone) {
            orFilters.push(
                Filter.and(
                    Filter.where("telephone", "==", `+237${telephone}`),
                    Filter.or(
                        Filter.where("verification.emailVerifie", "==", true),
                        Filter.where("verification.telephoneVerifie", "==", true),
                    )
                )
            );
        }

        if (orFilters.length === 0) {
            throw new Error("les données fournir sont incorrectes");
        }

        const bailleurs = await db.collection("bailleur")
            .where(orFilters.length === 1 ? orFilters[0] : Filter.or(...orFilters))
            .get();

        console.log(bailleurs.empty)
        // verication que le tableau des utilisateur authentifier ayant les memes donnes est vide
        if(!bailleurs.empty){
            if(uGoogle){
                const bailleur = bailleurs.docs[0]
                idUser = bailleur.id
                user = bailleur.data()
                try{
                    const response = await fetch(`${process.env.BASE_URL}/api/connexion/bailleur`,{
                        method:"POST",
                        credentials: "include",
                        headers:{"Content-Type": "application/json"},
                        body: JSON.stringify({tokenGoogle: idTokenGoogle})
                    })
                    if(!response.ok){
                        return res.status(409).json({
                            redirect: false,
                            path:null,
                            success: false,
                            msg: "erreur serveur veuillez plutot vous connecter"
                        })
                    }
                    const data = await response.json()
                    if(!data.success){
                        return res.status(409).json({
                            redirect: false,
                            path:null,
                            success: false,
                            msg: "impossible d'avoir accès à ce compte,veuillez plus tot vous connecter"
                        })
                    }
                    else{
                        return res.status(200).json({
                            ...data,
                            connexion:true
                        })
                    }
                    
                }catch(err){
                    console.log(err)
                    return res.status(409).json({
                        redirect: false,
                        path:null,
                        success: false,
                        msg: "erreur serveur veuillez plutot vous connecter"
                    })
                }
                


            }else{
                return res.status(409).json({
                    redirect: false,
                    path:null,
                    success: false,
                    msg: "cet utilisateur existe deja veuillez réessayer avec un autre identifiant"
                })
            }

            
        }
        else{

            
            // recuperation des utilisateurs identiques non authentifier
            const usersNonAuth = await db.collection("bailleur")
            .where(
                Filter.or(
                    
                    Filter.and(
                        Filter.where("uidGoogle","==",  userIdGoogle),
                        Filter.where("verification.emailVerifie","==",false),
                        Filter.where("verification.telephoneVerifie","==",false),
                    ),
                    Filter.and(
                        Filter.where("email","==",email),
                        Filter.where("verification.emailVerifie","==",false),
                        Filter.where("verification.telephoneVerifie","==",false),
                    ),
                    Filter.and(
                        Filter.where("telephone","==",`+237${telephone}`),
                        Filter.where("verification.emailVerifie","==",false),
                        Filter.where("verification.telephoneVerifie","==",false),
                    )
                )
            ).get();

            // suppression des utilisateurs identiques non authentifier
            if(!usersNonAuth.empty){
                const batch = db.batch()
                usersNonAuth.forEach(user=>{
                    batch.delete(user.ref)
                })
                batch.commit();
            }
            
            
            
            let completudeProfilPourcentage = CompletudeProfilBailleur({nom,emailVerifie:Boolean(userIdGoogle),telephoneVerifie:false,localisation
                ,cni,cniVerifie: false,imageAnciensContrats:[],photoProfil, dateNaissance
            }) ?? 45


            let emailVerifie = false
            if(uGoogle){
                emailVerifie = true
            }
            // creation du model de bailleur
            const bailleur = new Bailleur({typeProfil,
                nom,email, prenom,telephone:`+237${telephone}`,password,
                photoProfil,dateNaissance, localisation,
                uidGoogle :  uGoogle?.uidGoogle ?? null,
                cni, imageAnciensContrats, completudeProfilPourcentage, 
                emailVerifie : emailVerifie
            })

            const bailleurFirebaseObject = bailleur.toFirebase()
            

            // enregistrement du bailleur dans la base de donness
            const userdoc = await  (await db.collection("bailleur").add(bailleurFirebaseObject)).get();
            console.log("bailleur crée : "+userdoc.id)

            //recuperation l'id et des donnes 
            idUser = userdoc.id
            user = {...userdoc.data()};

            
                

            //creation de la session (même schéma "session" que celui lu par le middleware :
            // userId / expireAt), donc le cookie posé ici sera directement valide
            // pour authBailleur / identifierUtilisateur juste après.
            await createSession(res,userdoc.id)

            // ------------------------------------------------------------
            // Adaptation au middleware : createAuthMiddleware bloque (403,
            // fetchApi:true, path:'/api/otp/...') tout utilisateur dont
            // verification.emailVerifie ET verification.telephoneVerifie
            // sont false. Un compte créé sans Google est donc *déjà* dans
            // cet état juste après l'inscription. Plutôt que de laisser le
            // front découvrir ça au prochain appel authBailleur, on le
            // prévient tout de suite avec le même contrat fetchApi/path.
            // ------------------------------------------------------------
            const estVerifie = user?.verification?.emailVerifie || user?.verification?.telephoneVerifie

            if (!estVerifie) {
                return res.status(200).json({
                    success: true,
                    msg: "Compte créé avec succès, veuillez vérifier votre compte",
                    user,
                    ...compteNonVerifie(
                        email ? "/api/otp/envoieCode/email" : "/api/otp/envoieCode/telephone"
                    ),
                })
            }

            return res.status(200).json({
                success: true,
                msg:"utilisateur a été crée avec success",
                user,
                redirect: false,
                path:null
            })
        }
    }
    catch(err){
        console.log("erreur creation bailleur : "+err)
        return res.status(500).json(REPONSE_ERREUR_SERVEUR)
    }

}

module.exports = { createBailleur }