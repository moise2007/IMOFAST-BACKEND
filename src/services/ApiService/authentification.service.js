const bcrypt = require("bcrypt");

const authentificationRepository = require("../../repositories/authentification.repository");
const authentificationModel = require("../../models/authentification");

const {OTPService} = require("../opt.service");
const { sendEmail } = require("../mail.service");
const { normalizeTelephone } = require("../../utils/telephone");
const { createSession } = require("../../utils/session");
const { Bailleur } = require("../../models/bailleur");
const { Locataire } = require("../../models/locataire");
const { validatorPassword } = require("../../utils/validator/validator");
const AppError = require("../../errors/AppError");

const ROLES_AUTORISES = ["bailleur","locataire"]
/**
 * Service responsable de la gestion de l'authentification.
 *
 * Responsabilités :
 * - création de compte ;
 * - connexion ;
 * - déconnexion ;
 * - authentification Google ;
 * - gestion des OTP ;
 * - vérification email ;
 * - vérification téléphone ;
 * - modification de l'identifiant ;
 * - modification du mot de passe ;
 * - récupération du mot de passe.
 *
 * Le service ne contient aucune requête Firestore directe.
 * Toutes les opérations de persistance sont déléguées au repository.
 */

/**
 * Crée un nouveau compte.
 *
 * @param {Object} data
 * @param {"bailleur"|"locataire"} data.role
 * @param {string} data.nom
 * @param {string} data.prenom
 * @param {string} [data.email]
 * @param {string} [data.telephone]
 * @param {string} [data.password]
 * @param {string} [data.idToken]
 * @returns {Promise<Object>}
 */
const register = async (data) => {
    let {
        role,
        nom,
        prenom,
        email,
        telephone,
        password,
        idToken,
    } = data;

    let uid = null, emailVerifie = false

    if (!ROLES_AUTORISES.includes(role)) {
        throw new AppError("Rôle utilisateur invalide.");
    }

    if(idToken){
        const googledata = await 
        authentificationRepository.verifyGoogleToken(idToken)

        email = googledata.email
        telephone = googledata.telephone
        nom = googledata.nom
        prenom = googledata.prenom
        uid = googledata.uidGoogle
        emailVerifie = googledata.emailVerifie
    }
    else{
        const passwordValid = validatorPassword(password)
        if(!passwordValid){
            throw new AppError(
                "le mot de passe est invalide",
                422,
            )
        }
    }

    const normalizedEmail = email
        ? email.trim().toLowerCase()
        : null;

    const normalizedTelephone = telephone
        ? normalizeTelephone(telephone)
        : null;

    
    /*
     * Vérification des doublons parmi les comptes vérifiés.
     */
    const existingUser = await authentificationRepository.findVerifiedUserByIdentifier({
            role,
            email: normalizedEmail,
            telephone: normalizedTelephone,
        });

    if (existingUser) {
        throw new AppError("Un compte existe déjà avec cet identifiant.");
    }

    /*
     * Suppression des anciens comptes non vérifiés.
     */
    await authentificationRepository.deleteUnverifiedDuplicates({
        role,
        email: normalizedEmail,
        telephone: normalizedTelephone,
    });

    /*
     * Le mot de passe n'est pas obligatoire lorsque
     * l'inscription est effectuée avec Google.
     */
    let hashedPassword = null;

    if (password) {
        hashedPassword = await bcrypt.hash(password, 12);
    }

    console.log(emailVerifie)
    const userData = authentificationModel.createUser({
        role,
        nom,
        prenom,
        email: normalizedEmail,
        telephone: normalizedTelephone,
        emailVerifie: emailVerifie,
        password: hashedPassword,
        uidGoogle: uid,
    });

    console.log(userData)

    

    const user = await authentificationRepository.createUser(
        role,
        role == "bailleur" ? new Bailleur({...userData}).toFirebase()
        : new Locataire({...userData}).toFirebase()
    );

    /*
     * Création de la session après la création du compte.
     */
    const sessionId = await createSession(user.id, role);

    if(!sessionId){
        throw new AppError("ERROR_CREATED_SESSION",400)
    }

    /*
     * Si l'email n'est pas encore vérifié,
     * on déclenche l'envoi du code OTP.
     */
    if (normalizedEmail && !user.verification?.emailVerifie) {
        await sendOtp({
            identifiant: normalizedEmail,
        });
    }

    return {
        user,
        sessionId,
    };
};

/**
 * Authentifie un utilisateur avec son email ou son numéro de téléphone.
 *
 * Le compte doit posséder au moins un identifiant vérifié :
 * - email vérifié ;
 * - ou téléphone vérifié.
 *
 * @param {Object} params
 * @param {"bailleur"|"locataire"} params.role - Rôle de l'utilisateur.
 * @param {string} params.identifiant - Email ou numéro de téléphone.
 * @param {string} params.password - Mot de passe.
 * @param {Object} context
 * @param {import("express").Response} context.res - Réponse HTTP.
 * @param {import("express").Request} context.req - Requête HTTP.
 *
 * @returns {Promise<Object>} Informations nécessaires après authentification.
 *
 * @throws {Error} Si le rôle est invalide.
 * @throws {Error} Si aucun compte correspondant n'est trouvé.
 * @throws {Error} Si le mot de passe est incorrect.
 */
const login = async ({ role, identifiant, password }) => {
    if (!ROLES_AUTORISES.includes(role)) {
        throw new AppError("Rôle invalide.",422);
    }

    const user = await authentificationRepository.findVerifiedUserByIdentifier({
        role,
        email: identifiant.includes("@") ? identifiant : null,
        telephone: !identifiant.includes("@") ? identifiant : null,
    });

    if (!user) {
        throw new AppError(
            "Aucun compte trouvé avec ces identifiants.",404
        );
    }

    if (!user.password) {
        throw new AppError(
            "Ce compte utilise une authentification Google. " +
            "Veuillez cliquer sur « Continuer avec Google ».",
            422
        );
    }

    const passwordValid = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordValid) {
        throw new AppError("Mot de passe invalide.",422);
    }

    const sessionId = await createSession(user.id, role);

    if (!sessionId) {
        throw new AppError(
            "Impossible de créer la session.",
            400
        );
    }

    return {
        userId: user.id,
        role,
        sessionId
    };
};

/**
 * Déconnecte une session utilisateur.
 *
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
const logout = async (sessionId) => {
    if (!sessionId) {
        return;
    }

    await authentificationRepository.deleteSession(sessionId);
};

/**
 * Vérifie le token Google et authentifie l'utilisateur.
 *
 * @param {Object} data
 * @param {"bailleur"|"locataire"} data.role
 * @param {string} data.idToken
 * @returns {Promise<Object>}
 */
const verifyGoogle = async (data) => {
    const {
        role,
        idToken,
    } = data;

    if (!["bailleur", "locataire"].includes(role)) {
        throw new AppError("Rôle utilisateur invalide.",422);
    }

    if (!idToken) {
        throw new AppError("Le token Google est obligatoire.",422);
    }

    /*
     * La vérification réelle du token Google/Firebase
     * doit être réalisée dans le repository ou un service
     * d'infrastructure dédié.
     */
    const googleUser = await authentificationRepository.verifyGoogleToken(idToken);

    if (!googleUser) {
        throw new AppError("Token Google invalide.",422);
    }

    let user =
        await authentificationRepository.findUserByIdentifier({
            role,
            identifiant: googleUser.email.toLowerCase(),
        });

    /*
     * Si aucun compte n'existe, création automatique.
     */
    if (!user) {
        const userData = authentificationModel.createUser({
            role,
            nom: googleUser.nom,
            prenom: googleUser.prenom,
            email: googleUser.email.toLowerCase(),
            emailVerifie: googleUser?.emailVerifie ?? false,
            telephoneVerifie:false,
            telephone: googleUser.telephone || null,
            password: null,
            idToken,
        });

        user = await authentificationRepository.createUser(
            role,
            userData
        );
    }

    const sessionId = await createSession( user.id, role);

    return {
        user,
        sessionId,
    };
};

/**
 * Envoie un code OTP.
 *
 * @param {Object} data
 * @param {string} data.identifiant
 * @returns {Promise<Object>}
 */
const sendOtp = async ({ identifiant }) => {
    if (!identifiant) {
        throw new AppError("L'identifiant est obligatoire.");
    }

    const normalizedIdentifier =
        identifiant.includes("@")
            ? identifiant.trim().toLowerCase()
            : normalizeTelephone(identifiant);

    const code = (new OTPService()).generateOTP(normalizedIdentifier).code

    /*
     * Envoi email.
     */
    if (normalizedIdentifier.includes("@")) {
        await sendEmail( normalizedIdentifier,code);
    }

    /*
     * Pour le téléphone, le service OTP/SMS
     * prendra en charge l'envoi lorsque celui-ci
     * sera intégré.
     */
    return {
        identifiant: normalizedIdentifier,
    };
};

/**
 * Vérifie un code OTP.
 *
 * @param {Object} data
 * @param {string} data.identifiant
 * @param {string} data.code
 * @param {string} [data.newIdentifiant]
 * @param {"bailleur"|"locataire"} [data.role]
 * @returns {Promise<Object>}
 */
const verifyOtp = async (data) => {
    const {
        identifiant,
        newIdentifiant,
        code,
        role,
    } = data;

    const targetIdentifier = newIdentifiant || identifiant;

    const normalizedIdentifier =
        targetIdentifier.includes("@")
            ? targetIdentifier.trim().toLowerCase()
            : normalizeTelephone(targetIdentifier);

    const isValid = (new OTPService()).verifierCode({
            identifiant: normalizedIdentifier,
            code
        });

    if (!isValid.valid) {
        throw new AppError(isValid.msg,500);
    }

    /*
     * Si le rôle est fourni, la vérification concerne
     * directement un utilisateur existant.
     */
    if (role) {
        const user =
            await authentificationRepository.findUserByIdentifier({
                role,
                identifiant: normalizedIdentifier,
            });

        if (!user) {
            throw new AppError("Utilisateur introuvable.");
        }

        if (normalizedIdentifier.includes("@")) {
            await authentificationRepository.markEmailAsVerified(
                role,
                user.id
            );
        } else {
            await authentificationRepository.markTelephoneAsVerified(
                role,
                user.id
            );
        }

        return {
            verified: true,
            userId: user.id,
        };
    }

    return {
        verified: true,
        identifiant: normalizedIdentifier,
    };
};

/**
 * Vérifie l'adresse email d'un utilisateur.
 *
 * @param {Object} data
 * @param {"bailleur"|"locataire"} data.role
 * @param {string} data.identifiant
 * @param {string} data.code
 * @returns {Promise<Object>}
 */
const verifyEmail = async (data) => {
    const { role, identifiant,code } = data;

    if (!["bailleur", "locataire"].includes(role)) {
        throw new AppError("Rôle utilisateur invalide.",403);
    }

    const email = identifiant.trim().toLowerCase();

    const user = await authentificationRepository.findUserByIdentifier({
            role,
            identifiant: email,
        });

    if (!user) {
        throw new AppError("Utilisateur introuvable.",404);
    }

    const otpValid = (new OTPService()).verifierCode({
            identifiant: email,
            code
        });

    if (!otpValid.valid) {
        throw new AppError(otpValid.msg,400);
    }

    await authentificationRepository.markEmailAsVerified(
        role,
        user.id
    );

    return {
        verified: true,
        userId: user.id,
        email,
    };
};

/**
 * Vérifie le numéro de téléphone d'un utilisateur.
 *
 * @param {Object} data
 * @param {"bailleur"|"locataire"} data.role
 * @param {string} data.idToken
 * @returns {Promise<Object>}
 */
const verifyTelephone = async (data) => {
    const {
        role,
        idToken,
    } = data;

    if (!["bailleur", "locataire"].includes(role)) {
        throw new AppError("Rôle utilisateur invalide.");
    }

    if (!idToken) {
        throw new AppError("Le token de vérification est obligatoire.");
    }

    const decodedToken =
        await authentificationRepository.verifyTelephoneToken(
            idToken
        );

    if (!decodedToken?.phone_number) {
        throw new AppError(
            "Le numéro de téléphone n'a pas pu être vérifié."
        );
    }

    const telephone =
        normalizeTelephone(decodedToken.phone_number);

    const user =
        await authentificationRepository.findUserByIdentifier({
            role,
            identifiant: telephone,
        });

    if (!user) {
        throw new AppError("Utilisateur introuvable.");
    }

    await authentificationRepository.markTelephoneAsVerified(
        role,
        user.id
    );

    return {
        verified: true,
        userId: user.id,
        telephone,
    };
};

/**
 * Modifie l'identifiant d'un utilisateur.
 *
 * @param {Object} user
 * @param {string} user.id
 * @param {"bailleur"|"locataire"} user.role
 * @param {Object} data
 * @param {string} [data.email]
 * @param {string} [data.telephone]
 * @param {string} [data.lastEmail]
 * @param {string} [data.lastTelephone]
 * @returns {Promise<Object>}
 */
const updateIdentifier = async (user, data) => {
    const {
        email,
        telephone,
        lastEmail,
        lastTelephone,
    } = data;

    const normalizedEmail = email
        ? email.trim().toLowerCase()
        : null;

    const normalizedTelephone = telephone
        ? normalizeTelephone(telephone)
        : null;

    if (!normalizedEmail && !normalizedTelephone) {
        throw new AppError(
            "Un email ou un numéro de téléphone est obligatoire."
        );
    }

    /*
     * Vérification qu'un autre compte vérifié
     * n'utilise pas déjà le nouvel identifiant.
     */
    const existingUser =
        await authentificationRepository.findVerifiedUserByIdentifier({
            role: user.role,
            email: normalizedEmail,
            telephone: normalizedTelephone,
            excludeUserId: user.id,
        });

    if (existingUser) {
        throw new AppError(
            "Cet identifiant est déjà utilisé."
        );
    }

    const updatedUser =
        await authentificationRepository.updateIdentifier({
            role: user.role,
            userId: user.id,
            email: normalizedEmail,
            telephone: normalizedTelephone,
            lastEmail,
            lastTelephone,
        });

    /*
     * Un nouvel email doit être vérifié.
     */
    if (normalizedEmail) {
        await sendOtp({
            identifiant: normalizedEmail,
        });
    }

    return updatedUser;
};

/**
 * Modifie le mot de passe d'un utilisateur authentifié.
 *
 * @param {Object} user
 * @param {string} user.id
 * @param {"bailleur"|"locataire"} user.role
 * @param {Object} data
 * @param {string} data.currentPassword
 * @param {string} data.newPassword
 * @returns {Promise<Object>}
 */
const updatePassword = async (user, data) => {
    const {
        currentPassword,
        newPassword,
    } = data;

    if (!newPassword) {
        throw new AppError(
            "Le nouveau mot de passe est obligatoire.",422
        );
    }

    const existingUser =
        await authentificationRepository.findUserById({
            role: user.role,
            userId: user.id,
        });

    if (!existingUser) {
        throw new AppError("Utilisateur introuvable.",404);
    }

    /*
     * Les comptes OAuth peuvent ne pas posséder
     * de mot de passe local.
     */
    if (existingUser.password) {
        if (!currentPassword) {
            throw new AppError("Le mot de passe actuel est obligatoire.",422);
        }

        const passwordValid = await bcrypt.compare(currentPassword, existingUser.password);

        if (!passwordValid) {
            throw new AppError("Le mot de passe actuel est incorrect.",400);
        }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await authentificationRepository.updatePassword({
        role: user.role,
        userId: user.id,
        password: hashedPassword,
    });

    return {
        updated: true,
    };
};

/**
 * Lance la récupération d'un mot de passe oublié.
 *
 * @param {Object} data
 * @param {"bailleur"|"locataire"} data.role
 * @param {string} data.identifiant
 * @returns {Promise<Object>}
 */
const forgotPassword = async (data) => {
    const {
        role,
        identifiant,
        code,
    } = data;

    if (!["bailleur", "locataire"].includes(role)) {
        throw new AppError("Rôle utilisateur invalide.",422);
    }

    const otpValid = (new OTPService()).verifierCode({
            identifiant,
            code
        });

    if (!otpValid.valid) {
        throw new AppError(otpValid.msg,400);
    }


    const normalizedIdentifier =
        identifiant.includes("@")
            ? identifiant.trim().toLowerCase()
            : normalizeTelephone(identifiant);

    const user =
        await authentificationRepository.findUserByIdentifier({
            role,
            identifiant: normalizedIdentifier,
        });

    if (!user) {
        return {
            requested: true,
        };
    }

    /*
     * Création d'une autorisation temporaire permettant
     * de modifier le mot de passe après vérification OTP.
     */
    await authentificationRepository.createPasswordResetToken({
        userId: user.id,
        role,
        identifiant: normalizedIdentifier,
    });

    

    return {
        requested: true,
    };
};

/**
 * permet de réinitialiser le mot de passe
 *
 * @param {Object} data
 * @param {"bailleur"|"locataire"} data.role
 * @param {string} data.identifiant
 * @param {string} data.password
 * @returns {Promise<Object>}
 */
const forgotPasswordUpdate = async (data) => {
    const {
        role,
        password,
        identifiant
    } = data;

    if (!["bailleur", "locataire"].includes(role)) {
        throw new AppError("Rôle utilisateur invalide.",422);
    }

    const passwordValid = validatorPassword(password)
    if(!passwordValid){
        throw new AppError("mot de passe invalide, veuillez entrez un mot de passe fort")
    }

    //varification du processus de reintialisation
    const canUpdate = authentificationRepository.verifiedPasswordResetToken({
        role,
        identifiant
    })

    if(!canUpdate){
        throw new AppError("impossible de modifier le mot de passe",400)
    }


    const normalizedIdentifier =
        identifiant.includes("@")
            ? identifiant.trim().toLowerCase()
            : normalizeTelephone(identifiant);

    const user = await authentificationRepository.findUserByIdentifier({
            role,
            identifiant: normalizedIdentifier,
        });

    if (!user) {
        throw new AppError("impossible de modifier le mot de passe",400)
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    await authentificationRepository.updatePassword({
        role,
        userId: user.id,
        password: hashedPassword
    })

    return{
        changed: true
    }
    
};

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
    forgotPasswordUpdate
};
