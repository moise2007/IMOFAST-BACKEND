const bcrypt = require("bcrypt");

const bailleurRepository = require("../../repositories/bailleur.repository");
const { normalizeTelephone } = require("../../utils/telephone");

/**
 * Récupère les données du bailleur authentifié.
 *
 * @async
 * @param {Object} user
 * @returns {Promise<Object>}
 * @throws {Error}
 */
const getDataBailleur = async (user) => {
    const bailleurId = user.id || user.userId;

    if (!bailleurId) {
        throw new Error(
            "Impossible d'identifier le bailleur."
        );
    }

    const bailleur = await bailleurRepository.findById(
        bailleurId
    );

    if (!bailleur) {
        throw new Error(
            "Bailleur introuvable."
        );
    }

    return sanitizeBailleur(bailleur);
};

/**
 * Récupère les données nécessaires à l'accueil
 * du bailleur.
 *
 * @async
 * @param {Object} user
 * @returns {Promise<Object>}
 */
const getDataAccueilBailleur = async (user) => {
    const bailleurId = user.id || user.userId;

    const bailleur = await bailleurRepository.findById(
        bailleurId
    );

    if (!bailleur) {
        throw new Error(
            "Bailleur introuvable."
        );
    }

    return {
        idPublic: bailleur.idPublic,
        nom: bailleur.nom,
        prenom: bailleur.prenom,
        nomAgence: bailleur.nomAgence,
        photoProfil: bailleur.photoProfil,
        score: bailleur.score,
        notation: bailleur.notation,
        activite: bailleur.activite,
        forfait: bailleur.forfait,
        status: bailleur.status,
        enligne: bailleur.enligne,
    };
};

/**
 * Récupère le profil d'un bailleur.
 *
 * @async
 * @param {string} idPublic
 * @returns {Promise<Object>}
 */
const getProfilBailleur = async (idPublic) => {
    const bailleur = await bailleurRepository.findByPublicId(
        idPublic
    );

    if (!bailleur) {
        throw new Error(
            "Bailleur introuvable."
        );
    }

    return sanitizeBailleur(bailleur);
};

/**
 * Met à jour les informations du bailleur.
 *
 * Les modifications de mot de passe et d'identifiant
 * ne sont pas traitées ici : elles appartiennent au domaine
 * authentification.
 *
 * @async
 * @param {Object} user
 * @param {Object} data
 * @returns {Promise<Object>}
 */
const updateDataBailleur = async (user, data) => {
    const bailleurId = user.id || user.userId;

    const bailleur = await bailleurRepository.findById(
        bailleurId
    );

    if (!bailleur) {
        throw new Error(
            "Bailleur introuvable."
        );
    }

    const updateData = {};

    const allowedFields = [
        "nom",
        "prenom",
        "sexe",
        "langue",
        "autreNumero",
        "devise",
        "photoProfil",
        "dateNaissance",
        "nomAgence",
        "localisation",
        "cni",
        "typeProfil",
    ];

    allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
            updateData[field] = data[field];
        }
    });

    if (data.telephone !== undefined) {
        updateData.telephone = normalizeTelephone(
            data.telephone
        );
    }

    if (data.email !== undefined) {
        updateData.email = data.email
            ? data.email.trim().toLowerCase()
            : "";
    }

    if (updateData.nom !== undefined) {
        updateData.nom = updateData.nom.trim();
    }

    if (updateData.prenom !== undefined) {
        updateData.prenom = updateData.prenom.trim();
    }

    const profil = {
        ...bailleur,
        ...updateData,
    };

    updateData.notation = {
        ...bailleur.notation,
        completudeProfilPourcentage:
            calculateProfileCompletion(profil),
    };

    const updatedBailleur =
        await bailleurRepository.update(
            bailleurId,
            updateData
        );

    return sanitizeBailleur(updatedBailleur);
};

/**
 * Supprime le compte d'un bailleur.
 *
 * Le mot de passe est vérifié uniquement pour un compte
 * utilisant une authentification classique.
 *
 * @async
 * @param {Object} user
 * @param {Object} data
 * @returns {Promise<void>}
 */
const deleteBailleur = async (user, data = {}) => {
    const bailleurId = user.id || user.userId;

    const bailleur = await bailleurRepository.findById(
        bailleurId
    );

    if (!bailleur) {
        throw new Error(
            "Bailleur introuvable."
        );
    }

    const isGoogleAccount = Boolean(
        bailleur.uidGoogle
    );

    if (!isGoogleAccount) {
        if (!data.password) {
            throw new Error(
                "Le mot de passe est obligatoire."
            );
        }

        if (!bailleur.password) {
            throw new Error(
                "Impossible de vérifier le mot de passe."
            );
        }

        const passwordValid = await bcrypt.compare(
            data.password,
            bailleur.password
        );

        if (!passwordValid) {
            throw new Error(
                "Mot de passe incorrect."
            );
        }
    }

    await bailleurRepository.deleteSessions(
        bailleurId
    );

    await bailleurRepository.remove(
        bailleurId
    );
};

/**
 * Supprime les informations sensibles d'un bailleur
 * avant de les retourner au client.
 *
 * @param {Object} bailleur
 * @returns {Object}
 */
const sanitizeBailleur = (bailleur) => {
    if (!bailleur) {
        return null;
    }

    const {
        password,
        ...publicBailleur
    } = bailleur;

    return publicBailleur;
};

/**
 * Calcule le pourcentage de complétude du profil.
 *
 * Cette fonction reste volontairement simple.
 * Les règles métier pourront être affinées lorsque
 * les champs obligatoires du profil seront définitivement fixés.
 *
 * @param {Object} bailleur
 * @returns {number}
 */
const calculateProfileCompletion = (bailleur) => {
    const fields = [
        bailleur.nom,
        bailleur.prenom,
        bailleur.email,
        bailleur.telephone,
        bailleur.sexe,
        bailleur.langue,
        bailleur.devise,
        bailleur.photoProfil,
        bailleur.dateNaissance,
        bailleur.nomAgence,
        bailleur.localisation,
        bailleur.typeProfil,
    ];

    const completedFields = fields.filter(
        (field) =>
            field !== null &&
            field !== undefined &&
            field !== ""
    ).length;

    return Math.round(
        (completedFields / fields.length) * 100
    );
};

module.exports = {
    getDataBailleur,
    getDataAccueilBailleur,
    getProfilBailleur,
    updateDataBailleur,
    deleteBailleur,
};