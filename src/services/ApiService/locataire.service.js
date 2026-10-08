const bcrypt = require("bcrypt");

const locataireRepository = require("../../repositories/locataire.repository");
const { normalizeTelephone } = require("../../utils/telephone");

/**
 * Récupère les données du locataire authentifié.
 *
 * @async
 * @param {Object} user
 * @returns {Promise<Object>}
 */
const getDataLocataire = async (user) => {
    const locataireId = user.id || user.userId;

    if (!locataireId) {
        throw new Error(
            "Impossible d'identifier le locataire."
        );
    }

    const locataire =
        await locataireRepository.findById(
            locataireId
        );

    if (!locataire) {
        throw new Error(
            "Locataire introuvable."
        );
    }

    return sanitizeLocataire(locataire);
};

/**
 * Récupère le profil d'un locataire.
 *
 * @async
 * @param {string} idPublic
 * @returns {Promise<Object>}
 */
const getProfilLocataire = async (idPublic) => {
    const locataire =
        await locataireRepository.findByPublicId(
            idPublic
        );

    if (!locataire) {
        throw new Error(
            "Locataire introuvable."
        );
    }

    return sanitizeLocataire(locataire);
};

/**
 * Met à jour les informations du locataire.
 *
 * La modification du mot de passe et des identifiants
 * d'authentification est gérée par le domaine authentification.
 *
 * @async
 * @param {Object} user
 * @param {Object} data
 * @returns {Promise<Object>}
 */
const updateLocataire = async (user, data) => {
    const locataireId = user.id || user.userId;

    const locataire =
        await locataireRepository.findById(
            locataireId
        );

    if (!locataire) {
        throw new Error(
            "Locataire introuvable."
        );
    }

    const updateData = {};

    /**
     * Champs appartenant au profil locataire.
     *
     * L'email et le téléphone sont volontairement exclus.
     * Leur modification appartient au domaine authentification.
     */
    const allowedFields = [
        "nom",
        "prenom",
        "sexe",
        "langue",
        "autreNumero",
        "profession",
        "dateNaissance",
        "localisation",
        "photoProfil",
    ];

    allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
            updateData[field] = data[field];
        }
    });

    if (data.telephone !== undefined) {
        updateData.telephone =
            normalizeTelephone(
                data.telephone
            );
    }

    if (data.nom !== undefined) {
        updateData.nom = data.nom.trim();
    }

    if (data.prenom !== undefined) {
        updateData.prenom = data.prenom.trim();
    }

    const profil = {
        ...locataire,
        ...updateData,
    };

    updateData.completudeProfilPourcentage =
        calculateProfileCompletion(profil);

    const updatedLocataire =
        await locataireRepository.update(
            locataireId,
            updateData
        );

    return sanitizeLocataire(
        updatedLocataire
    );
};

/**
 * Supprime le compte d'un locataire.
 *
 * @async
 * @param {Object} user
 * @param {Object} data
 * @returns {Promise<void>}
 */
const deleteLocataire = async (
    user,
    data = {}
) => {
    const locataireId = user.id || user.userId;

    const locataire =
        await locataireRepository.findById(
            locataireId
        );

    if (!locataire) {
        throw new Error(
            "Locataire introuvable."
        );
    }

    const isGoogleAccount = Boolean(
        locataire.uidGoogle
    );

    if (!isGoogleAccount) {
        if (!data.password) {
            throw new Error(
                "Le mot de passe est obligatoire."
            );
        }

        if (!locataire.password) {
            throw new Error(
                "Impossible de vérifier le mot de passe."
            );
        }

        const passwordValid =
            await bcrypt.compare(
                data.password,
                locataire.password
            );

        if (!passwordValid) {
            throw new Error(
                "Mot de passe incorrect."
            );
        }
    }

    await locataireRepository.deleteSessions(
        locataireId
    );

    await locataireRepository.remove(
        locataireId
    );
};

/**
 * Supprime les informations sensibles
 * avant de retourner le locataire.
 *
 * @param {Object} locataire
 * @returns {Object|null}
 */
const sanitizeLocataire = (locataire) => {
    if (!locataire) {
        return null;
    }

    const {
        password,
        ...publicLocataire
    } = locataire;

    return publicLocataire;
};

/**
 * Calcule le pourcentage de complétude du profil.
 *
 * @param {Object} locataire
 * @returns {number}
 */
const calculateProfileCompletion = (
    locataire
) => {
    const fields = [
        locataire.nom,
        locataire.prenom,
        locataire.email,
        locataire.telephone,
        locataire.sexe,
        locataire.langue,
        locataire.profession,
        locataire.dateNaissance,
        locataire.localisation,
        locataire.photoProfil,
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
    getDataLocataire,
    getProfilLocataire,
    updateLocataire,
    deleteLocataire,
};