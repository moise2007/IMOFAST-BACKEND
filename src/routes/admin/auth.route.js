const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createId } = require("@paralleldrive/cuid2");
const { db } = require("../../config/firebase");
const { resend } = require("../../config/mail.config");
const { authAdmin } = require("../../middlewares/auth");

const routerAuthAdmin = express.Router();

const ADMIN_SECURITY_EMAIL = process.env.ADMIN_SECURITY_EMAIL;

class AdminVerificationCode {
    constructor(email) {
        this.email = email.trim().toLowerCase();

        this.code = this.generateCode();

        this.adminCode = this.code.substring(0, 6);
        this.ownerCode = this.code.substring(6, 12);

        this.codeHash = this.hashCode(this.code);

        this.createdAt = new Date().toISOString();

        this.expiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        ).toISOString();
    }

    generateCode() {
        let code = "";

        for (let i = 0; i < 12; i++) {
            code += crypto.randomInt(0, 10).toString();
        }

        return code;
    }

    hashCode(code) {
        return crypto
            .createHash("sha256")
            .update(code)
            .digest("hex");
    }

    toJSON() {
        return {
            email: this.email,
            codeHash: this.codeHash,
            createdAt: this.createdAt,
            expiresAt: this.expiresAt
        };
    }
}

const generateEmail = (code) => {
    return `
        <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 30px;
        ">
            <h2>Vérification du compte administrateur ImoFast</h2>

            <p>
                Une demande de création d'un compte administrateur
                ImoFast a été effectuée.
            </p>

            <p>
                Votre code de vérification est :
            </p>

            <div style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                margin: 30px 0;
            ">
                ${code}
            </div>

            <p>
                Ce code est valable pendant 10 minutes.
            </p>

            <p>
                Si vous n'êtes pas à l'origine de cette demande,
                veuillez ignorer cet email.
            </p>
        </div>
    `;
};

const sendEmail = async (email, code) => {
    try {
        const { error } = await resend.emails.send({
            from: "ImoFast <contact@imofast.org>",
            to: [email],
            subject: "Vérification du compte administrateur ImoFast",
            html: generateEmail(code)
        });

        if (error) {
            throw new Error(error.message);
        }

        return {
            success: true,
            msg: "Email envoyé"
        };
    } catch (err) {
        console.error("Erreur envoi email :", err);

        return {
            success: false,
            msg: "Email non envoyé"
        };
    }
};

const createAdminSession = async (adminId) => {
    const sessionId = createId();

    const expireAt = new Date(
        Date.now() + 10 * 60 * 1000
    ).toISOString();

    await db
        .collection("session")
        .doc(sessionId)
        .set({
            id: sessionId,
            userId: adminId,
            role: "admin",
            type: "admin_verification",
            verified: false,
            expireAt,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

    return {
        sessionId,
        expireAt
    };
};

const generateAdminToken = ({
    sessionId,
    adminId
}) => {
    return jwt.sign(
        {
            idsession: sessionId,
            userId: adminId,
            role: "admin"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
};

const setAdminCookie = (res, token) => {
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
};

routerAuthAdmin.post("/ins", async (req, res) => {
    let adminId = null;
    let sessionId = null;

    try {
        const {
            nom,
            prenom,
            email,
            password,
            confirmPassword
        } = req.body;

        if (
            !nom ||
            !prenom ||
            !email ||
            !password ||
            !confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message: "Tous les champs sont obligatoires"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Les mots de passe ne correspondent pas"
            });
        }

        if (password.length < 12) {
            return res.status(400).json({
                success: false,
                message:
                    "Le mot de passe doit contenir au moins 12 caractères"
            });
        }

        const emailNormalise = email
            .trim()
            .toLowerCase();

        const existingAdmin = await db
            .collection("admin")
            .where("email", "==", emailNormalise)
            .limit(1)
            .get();

        if (!existingAdmin.empty) {
            return res.status(409).json({
                success: false,
                message:
                    "Cette adresse email est déjà utilisée"
            });
        }

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        adminId = createId();

        const now = new Date().toISOString();

        const adminData = {
            id: adminId,
            nom: nom.trim(),
            prenom: prenom.trim(),
            email: emailNormalise,
            password: hashedPassword,
            role: "admin",
            verified: false,
            active: true,
            createdAt: now,
            updatedAt: now
        };

        await db
            .collection("admin")
            .doc(adminId)
            .set(adminData);

        const verification =
            new AdminVerificationCode(
                emailNormalise
            );

        await db
            .collection("adminVerification")
            .doc(adminId)
            .set({
                ...verification.toJSON(),
                adminId
            });

        const session =
            await createAdminSession(adminId);

        sessionId = session.sessionId;

        const emailAdmin = await sendEmail(
            emailNormalise,
            verification.adminCode
        );

        if (!emailAdmin.success) {
            await db
                .collection("admin")
                .doc(adminId)
                .delete();

            await db
                .collection("adminVerification")
                .doc(adminId)
                .delete();

            await db
                .collection("session")
                .doc(sessionId)
                .delete();

            return res.status(500).json({
                success: false,
                message:
                    "Impossible d'envoyer le code à l'administrateur"
            });
        }

        if (!ADMIN_SECURITY_EMAIL) {
            await db
                .collection("admin")
                .doc(adminId)
                .delete();

            await db
                .collection("adminVerification")
                .doc(adminId)
                .delete();

            await db
                .collection("session")
                .doc(sessionId)
                .delete();

            return res.status(500).json({
                success: false,
                message:
                    "Email de sécurité administrateur non configuré"
            });
        }

        const emailSecurity = await sendEmail(
            ADMIN_SECURITY_EMAIL,
            verification.ownerCode
        );

        if (!emailSecurity.success) {
            await db
                .collection("admin")
                .doc(adminId)
                .delete();

            await db
                .collection("adminVerification")
                .doc(adminId)
                .delete();

            await db
                .collection("session")
                .doc(sessionId)
                .delete();

            return res.status(500).json({
                success: false,
                message:
                    "Impossible d'envoyer le code de sécurité"
            });
        }

        return res.status(201).json({
            success: true,
            step: "verification",
            message:
                "Inscription initialisée. Les deux codes ont été envoyés.",
            sessionId,
            adminId,
            email: emailNormalise,
            expiresAt: verification.expiresAt
        });

    } catch (error) {
        console.error(
            "Erreur inscription admin :",
            error
        );

        if (adminId) {
            await db
                .collection("admin")
                .doc(adminId)
                .delete()
                .catch(() => {});

            await db
                .collection("adminVerification")
                .doc(adminId)
                .delete()
                .catch(() => {});
        }

        if (sessionId) {
            await db
                .collection("session")
                .doc(sessionId)
                .delete()
                .catch(() => {});
        }

        return res.status(500).json({
            success: false,
            message:
                "Erreur lors de la création du compte"
        });
    }
});

routerAuthAdmin.post("/verify", async (req, res) => {
    try {
        const {
            sessionId,
            adminCode,
            ownerCode
        } = req.body;

        if (
            !sessionId ||
            !adminCode ||
            !ownerCode
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Les deux codes sont obligatoires"
            });
        }

        if (
            !/^\d{6}$/.test(adminCode) ||
            !/^\d{6}$/.test(ownerCode)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Les codes doivent contenir exactement 6 chiffres"
            });
        }

        const sessionRef = db
            .collection("session")
            .doc(sessionId);

        const sessionDoc =
            await sessionRef.get();

        if (!sessionDoc.exists) {
            return res.status(401).json({
                success: false,
                message: "Session invalide"
            });
        }

        const sessionData =
            sessionDoc.data();

        if (
            sessionData.type !==
            "admin_verification"
        ) {
            return res.status(401).json({
                success: false,
                message: "Session invalide"
            });
        }

        if (
            sessionData.verified === true
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cette session est déjà vérifiée"
            });
        }

        if (
            !sessionData.expireAt ||
            new Date(sessionData.expireAt) < new Date()
        ) {
            await sessionRef.delete();

            return res.status(401).json({
                success: false,
                message:
                    "La session de vérification a expiré"
            });
        }

        const adminId =
            sessionData.userId;

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message:
                    "Administrateur introuvable"
            });
        }

        const adminRef = db
            .collection("admin")
            .doc(adminId);

        const adminDoc =
            await adminRef.get();

        if (!adminDoc.exists) {
            return res.status(404).json({
                success: false,
                message:
                    "Compte administrateur introuvable"
            });
        }

        const adminData =
            adminDoc.data();

        if (adminData.verified === true) {
            return res.status(400).json({
                success: false,
                message:
                    "Ce compte est déjà vérifié"
            });
        }

        const verificationRef =
            db
                .collection("adminVerification")
                .doc(adminId);

        const verificationDoc =
            await verificationRef.get();

        if (!verificationDoc.exists) {
            return res.status(404).json({
                success: false,
                message:
                    "Code de vérification introuvable"
            });
        }

        const verification =
            verificationDoc.data();

        if (
            !verification.expiresAt ||
            new Date(verification.expiresAt) < new Date()
        ) {
            await verificationRef.delete();

            await sessionRef.delete();

            return res.status(401).json({
                success: false,
                message:
                    "Le code de vérification a expiré"
            });
        }

        const fullCode =
            `${adminCode}${ownerCode}`;

        const codeHash = crypto
            .createHash("sha256")
            .update(fullCode)
            .digest("hex");

        if (
            codeHash !== verification.codeHash
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Les codes de vérification sont incorrects"
            });
        }

        const now =
            new Date().toISOString();

        await adminRef.update({
            verified: true,
            verifiedAt: now,
            updatedAt: now
        });

        const sessionExpireAt =
            new Date(
                Date.now() +
                7 * 24 * 60 * 60 * 1000
            ).toISOString();

        await sessionRef.update({
            type: "admin",
            role: "admin",
            verified: true,
            expireAt: sessionExpireAt,
            updatedAt: now
        });

        await verificationRef.delete();

        const token =
            generateAdminToken({
                sessionId,
                adminId
            });

        setAdminCookie(
            res,
            token
        );

        return res.status(200).json({
            success: true,
            verified: true,
            message:
                "Compte administrateur vérifié avec succès",
            sessionId,
            admin: {
                id: adminId,
                nom: adminData.nom,
                prenom: adminData.prenom,
                email: adminData.email,
                role: "admin",
                verified: true
            }
        });

    } catch (error) {
        console.error(
            "Erreur vérification admin :",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Erreur lors de la vérification"
        });
    }
});

routerAuthAdmin.get("/check-admin", async (req, res) => {
    try {
        const snapshot = await db
            .collection("admin")
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(200).json({
                success: true,
                exists: false,
                admin: null
            });
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        return res.status(200).json({
            success: true,
            exists: true,
            admin: {
                nom: data.nom ?? null,
                prenom: data.prenom ?? null,
                email: data.email ?? null,
                role: "admin",
                verified: data.verified === true,
                active: data.active === true
            }
        });

    } catch (error) {
        console.error("Erreur check-admin :", error);

        return res.status(500).json({
            success: false,
            exists: false,
            msg: "Erreur serveur"
        });
    }
});

const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000;

routerAuthAdmin.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                msg: "Email et mot de passe obligatoires"
            });
        }

        const emailNormalise = email.trim().toLowerCase();

        const snapshot = await db
            .collection("admin")
            .where("email", "==", emailNormalise)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({
                success: false,
                msg: "Email ou mot de passe incorrect"
            });
        }

        const adminDoc = snapshot.docs[0];
        const admin = adminDoc.data();

        if (!admin.password) {
            return res.status(401).json({
                success: false,
                msg: "Email ou mot de passe incorrect"
            });
        }

        const passwordCorrect = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordCorrect) {
            return res.status(401).json({
                success: false,
                msg: "Email ou mot de passe incorrect"
            });
        }

        if (admin.verified !== true) {
            return res.status(403).json({
                success: false,
                verified: false,
                msg: "Votre compte administrateur n'est pas encore vérifié"
            });
        }

        if (admin.active !== true) {
            return res.status(403).json({
                success: false,
                active: false,
                msg: "Votre compte administrateur est désactivé"
            });
        }

        const sessionId = createId();

        const now = new Date();

        const expireAt = new Date(
            now.getTime() + ADMIN_SESSION_DURATION
        );

        await db
            .collection("session")
            .doc(sessionId)
            .set({
                id: sessionId,
                userId: adminDoc.id,
                role: "admin",
                createdAt: now.toISOString(),
                expireAt: expireAt.toISOString()
            });

        const token = jwt.sign(
            {
                idsession: sessionId,
                role: "admin"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "24h"
            }
        );

        setAdminCookie(res,token)

        return res.status(200).json({
            success: true,
            msg: "Connexion réussie",
            admin: {
                id: adminDoc.id,
                nom: admin.nom,
                prenom: admin.prenom,
                email: admin.email,
                role: "admin",
                verified: true,
                active: true
            }
        });

    } catch (error) {
        console.error("Erreur connexion admin :", error);

        return res.status(500).json({
            success: false,
            msg: "Une erreur est survenue, veuillez réessayer plus tard"
        });
    }
});

module.exports = {
    routerAuthAdmin
};