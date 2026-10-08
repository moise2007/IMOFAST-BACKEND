const profilRepository = require("../../repositories/profil.repository");
const { Profil } = require("../../models/profil");

/**
 * Crée une erreur métier.
 *
 * @param {string} message
 * @param {number} statusCode
 * @throws {Error}
 */
const createBusinessError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;

    throw error;
};

/**
 * Récupère les informations publiques d'un profil.
 *
 * Pour un bailleur :
 * - récupère le profil ;
 * - récupère au maximum 15 annonces ;
 * - récupère les biens associés aux annonces ;
 * - rattache chaque bien à son annonce.
 *
 * Pour un locataire :
 * - récupère uniquement les informations du profil.
 *
 * @param {Object} params
 * @param {string} params.idPublic
 * @param {"bailleur"|"locataire"} params.role
 *
 * @returns {Promise<Object>}
 */
const getProfil = async ({ idPublic, role }) => {
    const profil = await profilRepository.findProfil(
        role,
        idPublic
    );

    if (!profil) {
        createBusinessError(
            "Le profil n'existe pas.",
            404
        );
    }

    let annonces = [];

    /**
     * Les annonces concernent uniquement les bailleurs.
     */
    if (role === "bailleur") {
        const annoncesData =
            await profilRepository.findAnnoncesByBailleur(idPublic);

        const idsBien = [
            ...new Set(
                annoncesData
                    .map((annonce) => annonce.bienId)
                    .filter(Boolean)
            ),
        ];

        const biens =
            await profilRepository.findBiensByPublicIds(idsBien);

        const biensById = new Map(
            biens.map((bien) => [
                bien.idPublic,
                bien,
            ])
        );

        annonces = annoncesData.map((annonce) => ({
            ...annonce,

            bien: annonce.bienId
                ? biensById.get(annonce.bienId) ?? null
                : null,
        }));
    }

    const result = new Profil({
        idPublic,
        role,
        profil,
        annonces,
    });

    return result.toJSON();
};

module.exports = {
    getProfil,
};