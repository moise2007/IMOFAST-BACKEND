const express = require("express");

const {
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
} = require("../controllers/authentification.controller");

const { authBailleurLocataireAdmin } = require("../middlewares/auth");

const {
    registerSchema,
    loginSchema,
    googleAuthSchema,
    sendOtpSchema,
    verifyOtpSchema,
    verifyEmailSchema,
    verifyTelephoneSchema,
    updateIdentifierSchema,
    updatePasswordSchema,
    forgotPasswordSchema,
    validate,
} = require("../validators/authentification.validator");

const routerAuthentification = express.Router();

/**
 * @route POST /auth/register
 * @description Crée un nouveau compte utilisateur.
 */
routerAuthentification.post( "/register", validate(registerSchema), register);

/**
 * @route POST /auth/login
 * @description Authentifie un utilisateur avec son identifiant et son mot de passe.
 */
routerAuthentification.post("/login",validate(loginSchema),login);

/**
 * @route POST /auth/google
 * @description Authentifie ou inscrit un utilisateur avec Google.
 */
routerAuthentification.post( "/google", validate(googleAuthSchema), verifyGoogle);

/**
 * @route DELETE /auth/logout
 * @description Déconnecte l'utilisateur actuellement authentifié.
 */
routerAuthentification.delete( "/logout", authBailleurLocataireAdmin, logout);

/**
 * @route POST /auth/otp/send
 * @description Envoie un code OTP à l'identifiant fourni.
 */
routerAuthentification.post( "/otp/send", validate(sendOtpSchema), sendOtp);

/**
 * @route POST /auth/otp/verify
 * @description Vérifie un code OTP.
 */
routerAuthentification.post( "/otp/verify", validate(verifyOtpSchema), verifyOtp);

/**
 * @route POST /auth/email/verify
 * @description Vérifie une adresse email avec un code OTP.
 */
routerAuthentification.post( "/email/verify", validate(verifyEmailSchema), verifyEmail);

/**
 * @route POST /auth/telephone/verify
 * @description Vérifie un numéro de téléphone.
 */
routerAuthentification.post( "/telephone/verify", validate(verifyTelephoneSchema), verifyTelephone);

/**
 * @route PATCH /auth/identifier
 * @description Modifie l'adresse email ou le numéro de téléphone de l'utilisateur.
 */
routerAuthentification.patch( 
    "/identifier",authBailleurLocataireAdmin,
    validate(updateIdentifierSchema),
    updateIdentifier
);

/**
 * @route PATCH /auth/password
 * @description Modifie le mot de passe de l'utilisateur authentifié.
 */
routerAuthentification.patch(
    "/password",
    authBailleurLocataireAdmin,
    validate(updatePasswordSchema),
    updatePassword
);

/**
 * @route POST /auth/password/forgot
 * @description Lance la procédure de récupération du mot de passe.
 */
routerAuthentification.post(
    "/password/forgot",
    validate(forgotPasswordSchema),
    forgotPassword
);

/**
 * @route POST /auth/password/forgot/update
 * @description Lance la procédure de récupération du mot de passe.
 */
routerAuthentification.post(
    "/password/forgot/update",
    validate(forgotPasswordSchema),
    forgotPasswordUpdate
);

module.exports = {
    routerAuthentification,
};