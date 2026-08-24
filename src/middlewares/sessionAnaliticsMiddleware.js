const { createId } = require("@paralleldrive/cuid2");
const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase");

async function verifyId(req) {
    const roles = ["bailleur","locataire","admin"]
    try {
        // Récupération du token
        const token = req.signedCookies?.token;

        if (!token) {
            return null;
        }

        // Vérification du token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (!decoded) {
            return null;
        }

        // Récupération de l'identifiant de session
        const sessionId = decoded?.idsession;

        if (!sessionId) {
            return null;
        }

        // Récupération de la session
        const sessionRef = db.collection("session").doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return null;
        }

        const sessionData = sessionDoc.data();

        // Vérification de l'expiration
        const { expireAt } = sessionData;

        if (expireAt && new Date(expireAt) < new Date()) {
            await sessionRef.delete();
            return null;
        }

        // Récupération de l'identifiant utilisateur
        const userId = sessionData?.userId;

        if (!userId) {
            return null;
        }

        // Recherche de l'utilisateur dans les différentes collections
        let userDoc = null;
        let userRole = null;

        for (const role of roles) {
            const doc = await db
                .collection(role)
                .doc(userId)
                .get();

            if (doc.exists) {
                userDoc = doc;
                userRole = role;
                break;
            }
        }

        if (!userDoc || !userDoc.exists) {
            return null;
        }

        // Récupération des données utilisateur
        const userData = {
            id: userDoc.id,
            ...userDoc.data()
        };

        return {
            authenticated: true,
            userId,
            role: userRole,
            user: userData,
            sessionId
        };

    } catch (err) {
        console.error("Erreur verifyId:", err.message);
        return null;
    }
}

async function sessionMiddleware(req, res, next) {
    try {
        // Vérification de la session utilisateur
        const session = await verifyId(req);

        if (session) {
            req.userId = session.userId;
            req.role = session.role;
            req.user = session.user;
            req.inscrit = true;
        } else {
            req.userId = null;
            req.role = "visiteur";
            req.inscrit = false;
        }

        // Récupération de l'identifiant anonyme
        let anonymousId = req.signedCookies?.anonymousId;
        let exist = true

        // Création de l'identifiant anonyme s'il n'existe pas
        if (!anonymousId) {
            anonymousId = `Annm_${createId()}`;
            exist = false
            const isProd = process.env.ETAT === "production"
            res.cookie("anonymousId", anonymousId, {
                httpOnly: true,
                domain: isProd ? ".imofast.org" : undefined,
                secure:   isProd,
                sameSite: isProd ? "none" : "lax",
                signed: true,
                path:     "/",
                maxAge: 365 * 24 * 3600000,
            });
        }

        // Ajout de l'identifiant anonyme à la requête
        req.anonymousId = anonymousId;
        req.exist
        next();

    } catch (err) {
        console.error("Erreur sessionMiddleware:", err);
        next(err);
    }
}

module.exports = {sessionMiddleware}