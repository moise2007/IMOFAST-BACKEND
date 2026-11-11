
const { db } = require("../config/firebase");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// ======================================================
// CONFIGURATION
// ======================================================

const ACCESS_TOKEN_DURATION = "15m";
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const isProd = process.env.ETAT === "production";

// ======================================================
// UTILITAIRES
// ======================================================

/**
 * Hash SHA-256 d'une valeur.
 */
const hash = (value) =>
    crypto.createHash("sha256").update(value).digest("hex");

/**
 * Vérifie si la requête provient de l'application mobile.
 */
const isMobile = (req) =>
    req.headers?.["x-client"] === "mobile";

/**
 * Options communes des cookies.
 */
const getCookieOptions = () => ({
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    domain: isProd ? ".imofast.org" : undefined,
    signed: true,
});

// ======================================================
// CRÉATION DE SESSION
// ======================================================

/**
 * Crée une session dans Firestore et génère les tokens.
 *
 * @param {string} userId ID utilisateur
 * @param {string} role Rôle utilisateur
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 */
async function creerSession(userId, role) {
    if (!userId || !role) {
        throw new Error("userId et role sont obligatoires.");
    }

    const sessionRef = db.collection("session").doc();

    // Refresh token opaque et aléatoire
    const refreshToken = crypto.randomBytes(48).toString("hex");

    await sessionRef.set({
        userId,
        role,
        refreshHash: hash(refreshToken),
        expireAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
        createdAt: new Date(),
    });

    const accessToken = createAccessToken(sessionRef.id);

    return {
        accessToken,
        refreshToken,
    };
}

// ======================================================
// GÉNÉRATION DU TOKEN D'ACCÈS
// ======================================================

/**
 * Génère un access token JWT à partir de l'identifiant de session.
 *
 * @param {string} idsession ID de session
 * @returns {string}
 */
function createAccessToken(idsession) {
    if (!idsession) {
        throw new Error("L'identifiant de session est obligatoire.");
    }

    return jwt.sign(
        { idsession },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_DURATION }
    );
}

// ======================================================
// ENVOI DES TOKENS
// ======================================================

/**
 * Envoie les tokens au client.
 *
 * Mobile : tokens dans la réponse JSON.
 * Web : tokens dans des cookies HTTP-only.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Object} payload
 * @param {string} message
 */
function envoyerTokens(
    req,
    res,
    { accessToken, refreshToken, user },
    message = "Tokens envoyés avec succès."
) {
    if (!accessToken || !refreshToken) {
        throw new Error("Les tokens sont obligatoires.");
    }

    // Client mobile : envoi dans le JSON
    if (isMobile(req)) {
        return res.json({
            success: true,
            data: {
                user,
                accessToken,
                refreshToken,
            },
            message,
        });
    }

    // Client web : envoi dans les cookies
    const cookieOptions = getCookieOptions();

    res.cookie("token", accessToken, {
        ...cookieOptions,
        maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    res.cookie("refresh", refreshToken, {
        ...cookieOptions,
        maxAge: REFRESH_TOKEN_MAX_AGE,
        path: "/api/auth/refresh",
    });

    return res.json({
        success: true,
        data: { user },
        message,
    });
}

// ======================================================
// RÉCUPÉRATION DU TOKEN
// ======================================================

/**
 * Récupère le token depuis Authorization ou les cookies.
 *
 * Priorité :
 * 1. Authorization: Bearer <token>
 * 2. Cookie signé
 * 3. Cookie classique
 *
 * @param {Request} req
 * @returns {string|null}
 */
function getToken(req) {
    const authHeader = req.headers?.authorization;

    if (authHeader) {
        const [scheme, token, ...extra] = authHeader.trim().split(/\s+/);

        if (
            scheme?.toLowerCase() === "bearer" &&
            token &&
            extra.length === 0
        ) {
            return token;
        }
    }

    const cookieToken =
        req.signedCookies?.token ??
        req.cookies?.token;

    return typeof cookieToken === "string" && cookieToken.length > 0
        ? cookieToken
        : null;
}

// ======================================================
// GESTION DES COOKIES
// ======================================================

/**
 * Crée un cookie de session.
 *
 * @param {Response} res
 * @param {string} name Nom du cookie
 * @param {string} value Valeur du cookie
 * @param {Object} options Options supplémentaires
 * @returns {boolean}
 */
function setCookieSession(res, name, value, options = {}) {
    try {
        if (!res || !name || typeof name !== "string" || value == null) {
            return false;
        }

        res.cookie(name, value, {
            ...getCookieOptions(),
            maxAge: REFRESH_TOKEN_MAX_AGE,
            ...options,
        });

        return true;
    } catch (error) {
        console.error(
            "Erreur lors de la création du cookie :",
            error
        );

        return false;
    }
}

/**
 * Lit un cookie et retourne sa valeur.
 *
 * @param {Request} req Requête Express
 * @param {string} name Nom du cookie
 * @param {boolean} isSigned Indique si le cookie est signé
 * @returns {string|null}
 */
function readCookie(req, name, isSigned = true) {
    if (!req || !name || typeof name !== "string") {
        return null;
    }

    const value = isSigned
        ? req.signedCookies?.[name]
        : req.cookies?.[name];

    return typeof value === "string" ? value : null;
}

// ======================================================
// SUPPRESSION DES COOKIES
// ======================================================

/**
 * Supprime les cookies d'authentification.
 *
 * @param {Response} res
 */
function clearSessionCookies(res) {
    if (!res) return;

    const cookieOptions = getCookieOptions();

    res.clearCookie("token", {
        ...cookieOptions,
    });

    res.clearCookie("refresh", {
        ...cookieOptions,
        path: "/api/auth/refresh",
    });
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    creerSession,
    createSession: creerSession,
    createAccessToken,
    envoyerTokens,
    getToken,
    setCookieSession,
    readCookie,
    clearSessionCookies,
    isMobile,
};
