const { db, admin } = require("../config/firebase");
const { sendEmailToAlertError } = require("./sendMailErrorProduction.service");
const {Filter} = admin.firestore;

/**
 * supprime les utilisateurs qui n'ont pas verifie leur compte et qui possede cette email
 * @param {String} email email de l'utilisateur
 * @param {String} telephone numéro de téléphone de l'utilisateur
 * @param {String} role role de l'utilisateur
 * @returns 
 */
const supprimerDoublonsNonVerifies = async (email, telephone, role) => {
    try{
        // verification des role autorisees
        if(!["bailleur","locataire"].includes(role)){
            return false;
        }

        // initlisations des filtres
        const filters = [];
        if (email) {
            filters.push(Filter.and(
                Filter.where("email", "==", email),
                Filter.where("verification.emailVerifie","==", false),
                Filter.where("verification.telephoneVerifie","==", false),
            ));
        }
        if (telephone) {
            filters.push(Filter.and(
                Filter.where("telephone", "==", "+237"+telephone),
                Filter.where("verification.emailVerifie", "==", false),
                Filter.where("verification.telephoneVerifie","==", false),
            ));
        }
        if (filters.length === 0) return true;

        // recherche des doublons
        const snap = await db.collection(role)
            .where(filters.length === 1 ? filters[0] : Filter.or(...filters))
            .get();

        if (snap.empty) return true;

        // suppression des doublons
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return true;
    }
    catch(err){
        console.log("erreur de suppresion des doublons lors de l'authentification");
        await sendEmailToAlertError({
            title: "supression des doublons lors de l'authentifications",
            error: err
        });
        return false;
    }
}

module.exports={supprimerDoublonsNonVerifies};