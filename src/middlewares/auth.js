const jwt = require("jsonwebtoken")
const { db } = require("../config/firebase")



//initialisation des responses
const RESPONSES = {
    tokenManquant: {
        success: false, reconnection: true, fetchApi: false,
        msg: "Veuillez vous reconnecter pour accéder à votre compte"
    },
    sessionInvalide: {
        success: false, reconnection: true, fetchApi: false,
        msg: "Session invalide ou expirée, veuillez vous reconnecter"
    },
    userIntrouvable: {
        success: false, reconnection: true, fetchApi: false,
        msg: "Compte introuvable, veuillez vous reconnecter"
    },
    erreurServeur: {
        success: false, reconnection: false, fetchApi: false,
        msg: "Une erreur est survenue, veuillez réessayer plus tard"
    },
}

const ROLES_CONNUS = ["bailleur", "locataire"]



//lecture du token 
const getToken = (req) => {
    return req.signedCookies?.token ?? null
}


const createAuthMiddleware  = (role=[])=>async(req,res,next)=>{
  const clearAndRespond = (status,body)=>{
    res.clearCookie("token",{path: "/"})
    return res.status(status).json(body)
  }
  if(role.length == 0){
    return clearAndRespond(401,{...RESPONSES.tokenManquant, msg: "veuillez founir le role"})
  }
  try{
    //recuperation du cookie
    const token = getToken(req)
    console.log("token: " +token)
    if(!token){
      return clearAndRespond(401,RESPONSES.tokenManquant)
    }
   

    // ddecodage du cookie recu
    let decoded
    try{
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    }
    catch{
      return clearAndRespond(401,RESPONSES.sessionInvalide)
    }
    //verification de la presence de l'id de la session dans le cookie
    const sessionId = decoded?.idsession
    if(!sessionId){
      return clearAndRespond(401,RESPONSES.sessionInvalide)
    }

    //verification de l'existence de la session
    const sessionDoc = await db.collection("session").doc(sessionId).get()
    if (!sessionDoc.exists) {
        return clearAndRespond(401, RESPONSES.sessionInvalide)
    }
    //verification de expiration
    const {expireAt} = sessionDoc.data()
    if(new Date(expireAt) < new Date()){
      await db.collection('session').doc(sessionId).delete()
      return clearAndRespond(401,{
        ...RESPONSES.sessionInvalide,
        msg: "la sesison a expiré, veuillez vous reconnecter"
      })
    }

    //recuperation de utilisateur
    const userId = sessionDoc.data().userId
    if(!userId){
      return clearAndRespond(401,RESPONSES.sessionInvalide)
    }
    let userDoc = null;

    for(let ro of role){
      userDoc = await db.collection(ro).doc(userId).get()
      if(userDoc.exists){
        req.role = ro
        break
      }
    }
    if(!userDoc.exists){
      return clearAndRespond(401,RESPONSES.userIntrouvable)
    }
    
    const userData = {id:userDoc.id,...userDoc.data()}
    if(!(userData.verification?.emailVerifie || userData.verification?.telephoneVerifie)){
      return res.status(403).json({
        success: false,
        fetchApi: true,
        path: '/api/otp/envoieCode/email',
        msg: "Veuillez vérifier votre compte avant de continuer"
      })
    }
    
    
    // gestion des suspension
    if(!["mensuel","trimestriel","annuel","aucun"].includes(userData.forfait.type)&& ["locataire","bailleur"].includes(req.role)){
      const field = {"forfait.type": "aucun"}
      await susprendreCompte(userData.id,req.role,field)
      res.clearCookie("token",{path: "/"})
      return res.status(203).json({
          success: false,
          msg: ' votre compte a été suspendus pour 7 jours car nous avons répéré uns activité inhabituelle'
      })
    }

    if(new Date(userData?.finSuspension?._seconds*1000) < new Date() ){
      await db.collection(req.role).doc(userData.id).update({
        status: "actif",
        "finSuspension": null
      })
      userData.status = "actif"
      userData.finSuspension = null
    }

    if(userData?.status != "actif"  || new Date(userData?.finSuspension?._seconds*1000) < new Date()){
      res.clearCookie("token",{path: "/"})
      return res.status(203).json({
        success: true,
        suspendu: true,
        user: null,
        msg: `votre compte à été suspendu jusqu'au : ${new Date(userData.finSuspension?._seconds*1000).toLocaleDateString("fr-FR",{
          month:"short",
          year: "numeric",
          day: "2-digit"
        })}`
      })
    }

    // mise ajour automique de forfait
    if(new Date(userData?.forfait?.fin?._seconds*1000) < new Date()){
      await db.collection(req.role).doc(userData.id).update({
        "forfait.fin": null,
        "forfait.type": "aucun",
        "candidatures.candidaturesRestantes": 0
      })
      userData.forfait.type = "aucun"
      userData.forfait.fin = null
    }

    console.log(userData)
    //injestion dans la requette
    req.user = userData
    req.sessionId = sessionId

    next()
  }
  catch(err){
    console.error(`Erreur auth [${role}] : `+ err)
    return res.status(500).json(RESPONSES.erreurServeur)
  }
}

const identifierUtilisateur = async (req, res, next) => {
    req.role = "visiteur"
    req.user = null
    req.sessionId = null
 
    try {
        const token = getToken(req)
        if (!token) return next()
 
        let decoded
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        } catch {
            return next() // token invalide/expiré -> visiteur, sans bloquer
        }
 
        const sessionId = decoded?.idsession
        if (!sessionId) return next()
 
        const sessionDoc = await db.collection("session").doc(sessionId).get()
        if (!sessionDoc.exists) return next()
 
        const { expireAt, userId } = sessionDoc.data()
        if (!userId) return next()
 
        if (new Date(expireAt) < new Date()) {
            // Session expirée : nettoyage en arrière-plan, sans bloquer la requête
            db.collection("session").doc(sessionId).delete().catch(() => {})
            return next()
        }
 
        // Recherche de l'utilisateur parmi les rôles connus
        let userDoc = null
        let roleTrouve = null
        for (const role of ROLES_CONNUS) {
            const doc = await db.collection(role).doc(userId).get()
            if (doc.exists) {
                userDoc = doc
                roleTrouve = role
                break
            }
        }
        if (!userDoc) return next()
 
        const userData = { id: userDoc.id, ...userDoc.data() }
 
        // Compte non vérifié -> traité comme visiteur (mais requête non bloquée)
        const estVerifie =
            userData.verification?.emailVerifie || userData.verification?.telephoneVerifie
        if (!estVerifie) return next()
 
        req.role = roleTrouve
        req.user = userData
        req.sessionId = sessionId
        return next()
    } catch (err) {
        console.error("Erreur identifierUtilisateur : " + err)
        // Même en cas d'erreur serveur, on ne bloque pas : visiteur par défaut
        return next()
    }
}


const authLocataire = createAuthMiddleware(["locataire"])
const authBailleur = createAuthMiddleware(["bailleur"])
const authAdmin = createAuthMiddleware(["admin"])
const authBailleurLocataire = createAuthMiddleware(["bailleur","locataire"])
const authBailleurAdmin = createAuthMiddleware(["bailleur","admin"])
const authBailleurLocataireAdmin = createAuthMiddleware(["bailleur","locataire","admin"])
const authAdminLocataire = createAuthMiddleware(["admin","locataire"])




module.exports= {authLocataire,authBailleur,authAdmin,authBailleurAdmin
  ,authBailleurLocataire,authBailleurLocataireAdmin,authAdminLocataire,
  identifierUtilisateur 
}