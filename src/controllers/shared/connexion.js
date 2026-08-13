const { generateTokenSession } = require("../../services/tokenSession")
const { db, admin } = require("../../config/firebase")
const { verifyFacebookToken } = require("../../services/verifyIdFacebook.service")
const { verifyGoogleToken } = require("../../services/verifyIdGoogle.service")
const {Filter} = admin.firestore
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

// Seuls ces rôles ont une collection Firestore + une route /api/{role}/create
// correspondantes. Sans cette liste, "role" (qui vient directement de
// req.params.role) pouvait servir à interroger n'importe quelle collection
// Firestore (db.collection(role)) ou appeler n'importe quelle route interne
// (/api/${role}/create) — faille de sécurité corrigée ci-dessous.
const ROLES_AUTORISES = ["bailleur", "locataire"]


// funciton de creation du coookie

const setCookieSession = (res,sessionId) =>{
    const token = generateTokenSession(sessionId)
    const signed =  process.env.COOKIE_SECURE !== "false"
    res.cookie("token",token,{
        httpOnly: true,
        secure: signed,
        sameSite:signed ? "None" : "Lax",
        signed,
        path: "/",
        maxAge: 365 * 24 * 3600000,
    })
}

//function de creation de la session
const createSession  = async (res,userId)=>{
    const now = new Date()
    const expireAt = new Date()
    expireAt.setMonth(now.getMonth() +12)

    const sessionRef = await db.collection("session").add({
        userId,
        createAt: now,
        expireAt,
    })
    setCookieSession(res,sessionRef.id)
}
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

        // recuperatio du token ou l'email et du mot de passe
        let { nom="",prenom=null, password=null, email="",photoProfil=null, telephone = null, tokenGoogle= null } = req.body
        console.log(req.body)

        //role de connexion
        const role = req.params.role

        // Le rôle vient de l'URL : on le valide avant de s'en servir pour
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
                if(!uGoogle){
                    return res.status(404).json({
                        success: false,
                        redirect: false,
                        path: null,
                        msg: "Aucun compte trouvé avec ces identifiants"
                    })

                }

                try{
                    //en cas authentification par google alors on creer le compte
                    await createCompteGoogle(role,{
                        nom,prenom,email,telephone,photoProfil,idTokenGoogle: tokenGoogle,hasId: true
                    })
                    // Le cookie a été posé par la route /create
                    return res.status(200).json({
                        success: true,
                        redirect: true,
                        path: "completer",
                        msg: "Compte créé et connecté avec Google"
                    })
                }
                catch(err){
                    console.error(`Création compte Google [${role}] :`, err.message)
                    return res.status(409).json({
                        success: false,
                        redirect: false,
                        path: null,
                        msg: err.message || "Impossible de créer ce compte Google"
                    })
                }
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
        // creation de la sessio et du cookie
        await createSession(res,user.id)
        return res.status(200).json({
            success: true,
            redirect: false,
            path: null,
            msg: "Vous êtes bien connecté"
        })
    }
    catch (err) {
        console.log(`erreur connexion [${req.params?.role}]: `+err)
        // Aligné sur le reste du code (createBailleur, middleware) : une
        // erreur serveur renvoie un statut 500, pas 200.
        return res.status(500).json({
            success: false,
            redirect: false,
            path: null,
            msg: "Une erreur est survenue, veuillez réessayer plus tard"
        });
    }

    
}
module.exports = { connexion }