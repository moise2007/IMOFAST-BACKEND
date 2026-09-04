const { db, admin } = require("../../config/firebase");
const { Filter } = admin.firestore;

const ROLES_AUTORISES = ["locataire", "bailleur"]; // adapte à tes rôles réels

const identifiantExiste = async (req, res) => {
    try {
        const { identifiant } = req.body;
        const role = req.params.role;
        console.log({identifiant,role})

        // --- Validation des entrées ---
        if (!identifiant || typeof identifiant !== "string" || !identifiant.trim()) {
            return res.status(400).json({
                success: false,
                msg: "L'identifiant est requis",
            });
        }

        if (!ROLES_AUTORISES.includes(role)) {
            return res.status(400).json({
                success: false,
                msg: "Rôle invalide",
            });
        }

        const identifiantNormalise = identifiant.trim().toLowerCase();
        const estEmail = identifiantNormalise.includes("@");

        // --- Requête ciblée selon le type d'identifiant ---
        const query = estEmail
            ? db.collection(role).where(
                Filter.and(
                    Filter.where("email", "==", identifiantNormalise),
                    Filter.or(
                        Filter.where("verification.emailVerifie", "==", true),
                        Filter.where("verification.telephoneVerifie", "==", true)
                    )
                    
                )
              )
            : db.collection(role).where(
                Filter.and(
                    Filter.where("telephone", "==", `${identifiant.trim().startsWith("+237") ? identifiant.trim() : `+237${identifiant.trim()}`}`),
                    Filter.or(
                        Filter.where("verification.telephoneVerifie", "==", true),
                        Filter.where("verification.emailVerifie", "==", true),
                    )
                )
              );

        const users = await query.get();

        if (users.empty) {
            // Aucun compte vérifié n'utilise cet identifiant -> disponible
            return res.status(200).json({
                success: true,
                valid: true,
            });
        }

        // Un compte vérifié existe déjà avec cet identifiant -> indisponible
        return res.status(200).json({
            success: true,
            valid: false,
            msg: `${estEmail? "cet email" : "ce numéro de téléphone"} est déjà utilisé`,
        });

    } catch (err) {
        console.error("Erreur verifieIdentifiantExiste : " + err);
        return res.status(500).json({
            success: false,
            msg: "Erreur serveur",
        });
    }
};

module.exports = { identifiantExiste };