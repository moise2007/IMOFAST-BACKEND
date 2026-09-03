const { validatorEmail, validatorPhoneNumber } = require("../../utils/validator/validator");
const { db, admin } = require("../../config/firebase");
const { sendEmailToAlertError } = require("../../services/sendMailErrorProduction.service");
const { Filter } = admin.firestore;
const TimeStamp = admin.firestore.Timestamp;
const AllowsCollections = ["bailleur", "locataire"]



const updateIdentifiant = async (req, res) => {
    try {
        // reuperattion des donnes
        const { collection } = req.params;
        const { email, telephone, lastEmail, lastTelephone } = req.body;


        // verification de la collection
        if (!collection || !AllowsCollections.includes(collection)) {
            return res.status(200).json({
                success: false,
                message: "une erreur c'est produite , veuillez réessayez plustard"
            });
        }

        // verification des identifiant
        const data = {};
        if (email?.trim()) {
            data.email = email.trim().toLowerCase()
            data["verification.emailVerifie"] = false
        }
        if (telephone?.trim()) {
            data.telephone = telephone.replace(/\s/g, "")
            data["verification.telephoneVerifie"] = false
        }
        if (!Object.keys(data).length || !(validatorEmail(data?.email) || validatorPhoneNumber(data?.telephone)))
            return res.status(200).json({ success: false, message: "l'identifiant est invalide" });

        // verification des doubons
        const doublons = await db.collection(collection).where(Filter.or(
            data?.email
                ? Filter.and(
                    Filter.where("email", "==", data.email),
                    Filter.or(
                        Filter.where("verification.emailVerifie", "==", true),
                        Filter.where("verification.telephoneVerifie", "==", true),
                    )
                )
                : Filter.and(
                    Filter.where("telephone", "==", data.telephone),
                    Filter.or(
                        Filter.where("verification.emailVerifie", "==", true),
                        Filter.where("verification.telephoneVerifie", "==", true),
                    )
                )
        )).get()

        if (!doublons.empty) {
            return res.status(200).json({
                success: false,
                msg: "cet identifiant exite déjà"
            })
        }

        await db.collection(collection)
            .where(data.email ? Filter.where("email", "==", lastEmail) : Filter.where("telephone", "==", lastTelephone))
            .get().then(doc => {
                if (doc.empty) {
                    return res.status(200).json({
                        success: false,
                        msg: "une erreur inconnue s'est produite"
                    })
                }
                doc.docs[0].ref.update({ ...data, updatedAt: TimeStamp.now() })
            })


        return res.status(200).json({
            success: true,
            message: "Contact modifié avec succès",
        });
    } catch (err) {
        console.error("erreur de modification des identifiants : "+err);
        await sendEmailToAlertError({
            title: "erreur de modification des identifiants",
            error: err,
            req,
        })
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la modification"
        });
    }
}

module.exports = { updateIdentifiant }