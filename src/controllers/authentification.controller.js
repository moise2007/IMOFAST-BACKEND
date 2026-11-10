const crypto = require('node:crypto')
const { db } = require("../config/firebase");
const authentificationService = require("../services/ApiService/authentification.service");
const { setCookieSession, envoyerTokens, creerSession, createAccessToken } = require("../utils/session");

/**
 * Crée un nouveau compte utilisateur.
 *
 * Le compte peut correspondre à un bailleur ou à un locataire.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const register = async (req, res) => {
    const result = await authentificationService.register(req.body);
    // creation des cookies et envoie des tokens
    const data = await creerSession(result.user.id, result.user.role ?? result.role)
    envoyerTokens(req,res, {...data,user: result.user},"votre compte a ete creer avec success")
};

/**
 * Authentifie un utilisateur avec ses identifiants.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const login = async (req, res) => {
    const result = await authentificationService.login(req.body);
    

    // creation des cookies et envoie des tokens
    const data = await creerSession(result.user.id, result.user.role ?? result.role)
    envoyerTokens(req,res, {...data,user:result.user},"connexion a votre compte reussie")
};

/**
 * Déconnecte l'utilisateur actuellement authentifié.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const logout = async (req, res) => {
    await authentificationService.logout(req.sessionId);

    res.clearCookie("token", { path: "/" })
    res.clearCookie("refresh", { path: "/api/auth/refresh" })
    res.json({ success: true })
};

/**
 * Authentifie ou inscrit un utilisateur avec Google.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const verifyGoogle = async (req, res) => {
    const result = await authentificationService.verifyGoogle(req.body);

    // creation des cookies
    setCookieSession(res,result?.sessionId,req.body.role)

    res.status(200).json({
        success: true,
        connexion: result.exist,
        message: "Authentification Google réussie.",
        data: result,
    });
};

/**
 * verifie la disponiblite d'un email ou telephone
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const canUseIdentifiant = async (req, res) => {
    const result = await authentificationService.canUseIdentifiant(req.body);

    console.log(result)
    res.status(200).json({
        success: true,
        connexion: result.exist,
        message: "Authentification Google réussie.",
        data: result,
    });
};

/**
 * Envoie un code OTP à l'utilisateur.
 *
 * L'identifiant peut être une adresse email ou un numéro
 * de téléphone.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const sendOtp = async (req, res) => {
    const result = await authentificationService.sendOtp(req.body);

    res.status(200).json({
        success: true,
        message: "Code OTP envoyé avec succès.",
        data: result,
    });
};

/**
 * Vérifie un code OTP.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const verifyOtp = async (req, res) => {
    const result = await authentificationService.verifyOtp(req.body);

    res.status(200).json({
        success: true,
        message: "Code OTP vérifié avec succès.",
        data: result,
    });
};

/**
 * Vérifie l'adresse email d'un utilisateur.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const verifyEmail = async (req, res) => {
    const result = await authentificationService.verifyEmail(req.body);

    res.status(200).json({
        success: true,
        message: "Adresse email vérifiée avec succès.",
        data: result,
    });
};

/**
 * Vérifie le numéro de téléphone d'un utilisateur.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const verifyTelephone = async (req, res) => {
    const result = await authentificationService.verifyTelephone(req.body);

    res.status(200).json({
        success: true,
        message: "Numéro de téléphone vérifié avec succès.",
        data: result,
    });
};

/**
 * Met à jour l'identifiant d'un utilisateur.
 *
 * L'identifiant peut être une adresse email ou un numéro
 * de téléphone.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const updateIdentifier = async (req, res) => {
    const result = await authentificationService.updateIdentifier(
        req.user,
        req.body
    );

    res.status(200).json({
        success: true,
        message: "Identifiant mis à jour avec succès.",
        data: result,
    });
};

/**
 * Met à jour le mot de passe d'un utilisateur authentifié.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const updatePassword = async (req, res) => {
    const result = await authentificationService.updatePassword(
        req.user,
        req.body
    );

    res.status(200).json({
        success: true,
        message: "Mot de passe mis à jour avec succès.",
        data: result,
    });
};

/**
 * Lance le processus de récupération du mot de passe.
 *
 * Cette fonction est utilisée lorsqu'un utilisateur a oublié
 * son mot de passe.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const forgotPassword = async (req, res) => {
    const result = await authentificationService.forgotPassword(req.body);

    res.status(200).json({
        success: true,
        message: "Processus de récupération du mot de passe lancé.",
        data: result,
    });
};

/**
 * Lance le processus de récupération du mot de passe.
 *
 * Cette fonction est utilisée lorsqu'un utilisateur a oublié
 * son mot de passe.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const forgotPasswordUpdate = async (req, res) => {
    const result = await authentificationService.forgotPasswordUpdate(req.body);

    res.status(200).json({
        success: true,
        message: "le mot de passe a été réinitialiser avec succèss",
        data: result,
    });
};

/**
 * permet de generer le prochain access token
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const refreshToken = async(req,res)=>{
    const isMobile = (req) => req.headers["x-client"] === "mobile"
    const hash = (t) => crypto.createHash("sha256").update(t).digest("hex")
    const refreshToken = isMobile(req) ? req.body?.refreshToken : req.signedCookies?.refresh

    if (!refreshToken) return res.status(401).json({ success: false, reconnection: true })

    // Retrouver la session par le hash du refresh
    const snap = await db.collection("session")
    .where("refreshHash", "==", hash(refreshToken)).limit(1).get()

    if (snap.empty) {
        // Refresh inconnu : peut-être un token déjà utilisé et volé -> voir "détection de réutilisation"
        return res.status(401).json({ success: false, reconnection: true })
    }

    const doc = snap.docs[0]
    const s = doc.data()
    if (new Date(s.expireAt) < new Date()) {
        await doc.ref.delete()
        return res.status(401).json({ success: false, reconnection: true })
    }

    // Rotation : nouveau refresh, l'ancien devient invalide
    const newRefresh = crypto.randomBytes(48).toString("hex")
    await doc.ref.update({ refreshHash: hash(newRefresh), expireAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),})
    const accessToken = createAccessToken(doc.id)

    return envoyerTokens(req, res, { accessToken, refreshToken: newRefresh, user: undefined })
}

module.exports = {
    register,
    login,
    logout,
    verifyGoogle,
    sendOtp,
    verifyOtp,
    verifyEmail,
    verifyTelephone,
    updateIdentifier,
    updatePassword,
    forgotPassword,
    forgotPasswordUpdate,
    canUseIdentifiant,
    refreshToken,
};