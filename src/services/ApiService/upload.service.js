const {
    uploadImage,
    uploadVideo,
    uploadAudio,
} = require("../upload.service");

const uploadRepository = require("../../repositories/upload.repository");

const {
    TYPES_AUTORISES,
} = require("../../config/multer");

const DOSSIERS = {
    cni: "cni",
    imageAncienContrat: "anciens-contrats",
    photoProfil: "photos-profil",
    images: "images",
    videos: "videos",
};

/**
 * Détermine le dossier de stockage d'un champ multipart.
 *
 * @param {string} nomChamp
 * @returns {string}
 */
const getDossier = (nomChamp) => {
    return DOSSIERS[nomChamp] ?? "autres";
};

/**
 * Upload un fichier selon son type MIME.
 *
 * @param {Object} params
 * @param {Object} params.file
 * @param {string} params.dossier
 * @param {import("express").Request} params.req
 *
 * @returns {Promise<Object>}
 */
const uploadFile = async ({
    file,
    dossier,
    req,
}) => {
    const { buffer, mimetype } = file;

    if (TYPES_AUTORISES.images.includes(mimetype)) {
        return uploadImage(
            buffer,
            mimetype,
            dossier,
            req
        );
    }

    if (TYPES_AUTORISES.videos.includes(mimetype)) {
        return uploadVideo(
            buffer,
            mimetype,
            dossier,
            req
        );
    }

    if (TYPES_AUTORISES.audio.includes(mimetype)) {
        return uploadAudio(
            buffer,
            mimetype,
            dossier,
            req
        );
    }

    throw new Error(
        `Type de fichier non supporté : ${mimetype}`
    );
};

/**
 * Upload l'ensemble des fichiers reçus.
 *
 * @param {Object} params
 * @param {Object} params.files - Fichiers provenant de Multer.
 * @param {import("express").Request} params.req
 *
 * @returns {Promise<Object>}
 */
const uploadFiles = async ({
    files,
    req,
}) => {
    const result = {};

    await Promise.all(
        Object.entries(files).map(
            async ([nomChamp, fichiers]) => {
                const dossier = getDossier(nomChamp);

                result[nomChamp] = await Promise.all(
                    fichiers.map((file) =>
                        uploadFile({
                            file,
                            dossier,
                            req,
                        })
                    )
                );
            }
        )
    );

    return result;
};

/**
 * Supprime un média.
 *
 * @param {Object} params
 * @param {string} params.key
 *
 * @returns {Promise<void>}
 */
const supprimerMedia = async ({ key }) => {
    await uploadRepository.deleteFile(key);
};

module.exports = {
    uploadFiles,
    supprimerMedia,
};