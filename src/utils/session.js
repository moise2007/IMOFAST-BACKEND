const { db } = require("../config/firebase");
const { sendEmailToAlertError } = require("../services/sendMailErrorProduction.service");
const { generateTokenSession } = require("../services/tokenSession")

/**
 * cette fonction permet de créer une session et de garder dans les cookies
 * @param {String} userId  id de l'utilisateur
 * @param {String} role role de l'utilisateur
 */
const createSession = async (userId, role) => {
    try {
        // initlisation des delais
        const now = new Date();
        const expireAt = new Date();
        expireAt.setMonth(now.getMonth() + 1);

        // creation de la session
        const sessionRef = await db.collection("session").add({
            userId,
            createAt: now,
            expireAt,
            role
        });

        return sessionRef.id;
    }
    catch (err) {
        console.log("une erreur est survenue lors de la creation de la session")
        return null;
    }
}

/**
 * Crée les cookies d'authentification associés à une session utilisateur.
 * @param {Response} res - Response Express de la requête.
 * @param {String} sessionId - Identifiant de la session.
 * @param {String} role - Rôle de l'utilisateur.
 * @param {Request} req - requette de la demande
 * @returns {boolean} true si les cookies ont été créés, false en cas d'erreur.
 */
const setCookieSession = async (res, sessionId, role) => {
    try {
        // verification des role
        if (!["bailleur", "locataire", "admin"].includes(role)) {
            return false;
        }
        // generation du token
        const token = generateTokenSession(sessionId);

        // initlisation de l'environement
        const isProd = process.env.ETAT == "production";

        // initalisation des options des cookies
        const cookiesOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            path: "/",
            domain: isProd ? ".imofast.org" : undefined,
            signed: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
        };

        // creations des cookies
        res.cookie("token", token, cookiesOptions);
        res.cookie("role", role, cookiesOptions);

        // confirmation de la reusite de la creation de cookie
        return true;
    }
    catch (err) {
        console.log("erreur lors de la creation des cookies" + err);
        return false;
    }
};

/**
 * permet de lire un cookies et de retourner sa value
 * @param {Response} req Requette de Express
 * @returns {String ?? null} value final du cookie
 */
function readCookie(req, name, isSigned = true) {
    // verification des parametres
    if (!req || !name || typeof name != "string" || !path) {
        return null;
    }
    // recuperation du cookie
    return isSigned ? req.signedCookies[name] : req.cookies[name];
}

module.exports = { createSession, setCookieSession, readCookie };