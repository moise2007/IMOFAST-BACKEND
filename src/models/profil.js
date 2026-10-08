/**
 * Représente les données publiques d'un profil.
 */
class Profil {
    /**
     * @param {Object} params
     * @param {string} params.idPublic
     * @param {"bailleur"|"locataire"} params.role
     * @param {Object} params.profil
     * @param {Array<Object>} [params.annonces]
     */
    constructor({
        idPublic,
        role,
        profil,
        annonces = [],
    }) {
        this.idPublic = idPublic;
        this.role = role;
        this.profil = profil;
        this.annonces = annonces;
    }

    /**
     * Transforme le profil en objet JSON.
     *
     * @returns {Object}
     */
    toJSON() {
        return {
            idPublic: this.idPublic,
            role: this.role,
            profil: this.profil,
            annonces: this.annonces,
        };
    }
}

module.exports = {
    Profil,
};