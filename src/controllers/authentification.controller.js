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
    envoyerTokens(req,res, {...data,user: result.user},req.t("responses:backend.auth.registered"))
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
    envoyerTokens(req,res, {...data,user:result.user},req.t("responses:backend.auth.loggedIn"))
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

    require("../utils/session").clearSessionCookies(res);
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

    // creation des cookies et envoie des tokens
    const data = await creerSession(result.user.id, result.user.role ?? result.role)
    envoyerTokens(req,res, {...data,user:result.user},req.t("responses:backend.auth.loggedIn"))
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
        message: req.t("responses:backend.auth.identifierChecked"),
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
        message: req.t("responses:backend.auth.otpSent"),
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
        message: req.t("responses:backend.auth.otpVerified"),
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
        message: req.t("responses:backend.auth.emailVerified"),
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
        message: req.t("responses:backend.auth.phoneVerified"),
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
        message: req.t("responses:backend.auth.identifierUpdated"),
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
        message: req.t("responses:backend.auth.passwordUpdated"),
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
        message: req.t("responses:backend.auth.passwordRecoveryStarted"),
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
        message: req.t("responses:backend.auth.passwordReset"),
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
const refreshToken = require('../utils/asyncHandler').asyncHandler(async (req, res) => {
    const refresh = req.headers['x-client'] === 'mobile' ? req.body?.refreshToken : (req.signedCookies?.refresh ?? req.cookies?.refresh);
    const identity = await require('../services/ApiService/session.service').resolveSession({ refreshToken: refresh, refresh: true });
    if (!identity) return res.status(401).json({ success: false, reconnection: true, message: req.t('errors:backend.sessionInvalid') });
    return envoyerTokens(req, res, { ...identity.tokens, user: undefined }, req.t('responses:backend.sessionRefreshed'));
});
const me = require('../utils/asyncHandler').asyncHandler(async (req, res) => {
    const session = require('../utils/session');
    const identity = await require('../services/ApiService/session.service').resolveSession({
        accessToken: session.getToken(req), refreshToken: req.signedCookies?.refresh ?? req.cookies?.refresh,
    });
    res.set('Cache-Control', 'no-store');
    if (!identity) return res.json({ success: true, role: 'visiteur', user: null, onboarding: null });
    if (identity.tokens) session.writeSessionCookies(res, identity.tokens);
    const user = identity.user;
    return res.json({ success: true, role: identity.role,
        user: { idPublic: user.idPublic, nom: user.nom, prenom: user.prenom, photoProfil: user.photoProfil,
            verifie: identity.role === 'admin' ? user.verified === true : Boolean(user.verification?.emailVerifie || user.verification?.telephoneVerifie) },
        onboarding: identity.role === 'bailleur' ? (user.onboarding || { etape: 'bien', termine: false }) : null,
    });
});

module.exports = {
    me,
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
