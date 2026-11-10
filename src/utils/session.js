const { db } = require("../config/firebase");
const crypto = require("crypto")
const jwt = require("jsonwebtoken")


const hash = (t) => crypto.createHash("sha256").update(t).digest("hex")
const isMobile = (req) => req.headers["x-client"] === "mobile"
/**
 * cette fonction permet de créer une session et de garder dans les cookies
 * @param {String} userId  id de l'utilisateur
 * @param {String} role role de l'utilisateur
 */
async function creerSession(userId, role) {
  const sessionRef = db.collection("session").doc()
  const refreshToken = crypto.randomBytes(48).toString("hex")   // opaque, aléatoire

  await sessionRef.set({
    userId,
    role,
    refreshHash: hash(refreshToken),  
    expireAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    createdAt: new Date(),
  })

  const accessToken = jwt.sign({ idsession: sessionRef.id }, process.env.JWT_SECRET,{ expiresIn: "15m" })
  return { accessToken, refreshToken }
}


function createAccessToken(idsession){
  const accessToken = jwt.sign({ idsession }, process.env.JWT_SECRET,{ expiresIn: "15m" })
  return accessToken
}



function envoyerTokens(req, res, { accessToken, refreshToken, user }, message="token envoyer avec success") {
  console.log(isMobile(req))    
  if (isMobile(req)) {
        return res.json({ success: true, data: {user}, accessToken, refreshToken }, message)
    }
    const isProd = process.env.ETAT == "production";

    const COOKIE_BASE = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        domain: isProd ? ".imofast.org" : undefined,
        signed: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
    };


  res.cookie("token", accessToken, { ...COOKIE_BASE, maxAge: 15 * 60 * 1000 })
  res.cookie("refresh", refreshToken, {
    ...COOKIE_BASE,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/api/auth/refresh",
  })
  return res.json({ success: true, data: {user}, message })
}

module.exports = { envoyerTokens, creerSession, createAccessToken};