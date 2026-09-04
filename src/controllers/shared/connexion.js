const { generateTokenSession } = require("../../services/tokenSession")
const { db, admin } = require("../../config/firebase")
const { verifyGoogleToken } = require("../../services/verifyIdGoogle.service")
const {Filter} = admin.firestore
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { createSession } = require("../../services/cookies/cookie.service")
const ROLES_AUTORISES = ["bailleur", "locataire"]


// construction du filtre
const buildVerifiedFilter = (email,telephone) =>{
    const filters = []
    const VerifiedIdentifiant = Filter.or(
        Filter.where('verification.emailVerifie',"==",true),
        Filter.where('verification.telephoneVerifie',"==",true)
    )
    if(email){
        filters.push(
            Filter.and(
                Filter.where("email","==",email),
                VerifiedIdentifiant
            )
        )
    }
    if(telephone){
        filters.push(Filter.and(
            Filter.where("telephone", "==", "+237"+telephone),
            VerifiedIdentifiant
        ))
    }
    if(filters.length === 0) throw new Error("Aucun identifiant fournir")
    return filters.length === 1 ? filters[0] : Filter.or(...filters)
}


//creation du compte grace a la route create lors que l'utilisateur se connecte par google
//et qu'il ne possede pas encore de compte (bailleur ou locataire)
const createCompteGoogle = async (role, params) => {
    const response = await fetch(
        `${process.env.BASE_URL}/api/${role}/create`,
        {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(params),
        }
    )
    const data = await response.json()
    if (!response.ok || !data.success) {
        throw new Error(data.msg || "Création compte Google échouée")
    }
    return data
}



/**
 * Connecte un bailleur ou un locataire (selon req.params.role).
 * @param {Request} req
 * @param {Response} res
 */
const connexion = async(req, res) => {

    try {
        let user

        // recuperation du token ou l'email et du mot de passe
        let {password=null, email=null, telephone = null, tokenGoogle= null } = req.body

        //role de connexion
        const role = req.params.role

        // interroger Firestore ou appeler une route interne.
        if (!ROLES_AUTORISES.includes(role)) {
            return res.status(400).json({
                success: false,
                redirect: false,
                path: null,
                msg: "Rôle invalide"
            })
        }

        // verification du token 
        let uGoogle =null
        //verifie le token et recuperer les donnees
        if(tokenGoogle){
            uGoogle = await verifyGoogleToken(tokenGoogle)
            if(!uGoogle){
                return res.status(401).json({
                    success: false,
                    msg: 'Token Google inValide'
                })
            }
            email = uGoogle.email ?? email
        }
        
        //  validdation des identifiants
        if(!email && !telephone){
            return res.status(400).json({
                success: false,
                msg: "Veuillez fournir un email ou un numéro de téléphone"
            })
        }

        //recheche des utilisateurs utlisateurs similaire
        const filter = buildVerifiedFilter(email,telephone)
        const snapShot = await db.collection(role).where(filter).get()
        if(snapShot.empty){
            
            // en cas authentification normal erreur
            return res.status(404).json({
                success: false,
                redirect: false,
                path: null,
                msg: "Aucun compte trouvé avec ces identifiants"
            })

            

            // try{
            //     //en cas authentification par google alors on creer le compte
            //     const data= await createCompteGoogle(role,{
            //         nom,prenom,email,telephone,photoProfil,idTokenGoogle: tokenGoogle,hasId: true
            //     })
            //     // Le cookie a été posé par la route /create
            //     return res.status(200).json({
            //         success: true,
            //         redirect: true,
            //         path: "completer",
            //         msg: "Compte créé et connecté avec Google"
            //     })
            // }
            // catch(err){
            //     console.error(`Création compte Google [${role}] :`, err.message)
            //     return res.status(409).json({
            //         success: false,
            //         redirect: false,
            //         path: null,
            //         msg: err.message || "Impossible de créer ce compte Google"
            //     })
            // }
        }
        else{
            const userDoc = snapShot.docs[0]
            user = {id:userDoc.id , ...userDoc.data()}

            // verification du mot de passe 
            if(!uGoogle){
                if(!password){
                    return res.status(400).json({
                        success: false,
                        msg: "Mot de passe requis"
                    })
                }
                console.log(user)
                if(!user.password){
                    return res.status(400).json({
                        success: false,
                        msg: "veuillez cliquer sur 'continuer avec google'"
                    })
                }
                const isValid = await bcrypt.compare(password, user.password)
                if(!isValid){
                    return res.status(400).json({
                        success: false,
                        redirect: false,
                        path: null,
                        msg: "Mot de passe invalide"
                    })
                }
            }
        
        }
        console.log("ok")
        // creation de la sessio et du cookie
        const validCreatedSession = await createSession(res,user.id, role,req)
        console.log(validCreatedSession)
        if(!validCreatedSession){
            return res.status(400).json({
                success: false,
                msg: "erreur ce connexion",
                redirect: false
            })
        }
        return res.status(200).json({
            success: true,
            redirect: false,
            path: null,
            msg: "Vous êtes bien connecté"
        })
    }
    catch (err) {
        console.log(`erreur connexion [${req.params?.role}]: `+err)
        return res.status(500).json({
            success: false,
            redirect: false,
            path: null,
            msg: "Une erreur est survenue, veuillez réessayer plus tard"
        });
    }

    
}
module.exports = { connexion }