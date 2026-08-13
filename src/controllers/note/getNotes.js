const { db } = require("../../config/firebase");
const {  collection, query, where, getDocs, orderBy} = require("firebase/firestore");

const getNote = async (req, res) => {
    try {
        const { cibleId, typeCible, valeur, idPublic, auteurId,min,max } = req.query;

        // validation typeCible
        if (!["profil", "bailleur", "locataire", "bien", "annonce"].includes(typeCible)) {
        return res.status(409).json({
            success: false,
            msg: req.t("cible_not_found", { ns: "errors" }),
        });
        }

        // validation valeur (note)
        if (!valeur || valeur < 0 || valeur > 5) {
        return res.status(400).json({
            success: false,
            msg: req.t("error_note" ,{ns: "errors"}),
        });
        }

        //lecture des donnes dans firebase
        let ref = collection(db, "note");
        let constraints = [];

        if (typeCible) {
            constraints.push(where("typeCible", "==", typeCible));
        }

        if (cibleId) {
            constraints.push(where("cibleId", "==", cibleId));
        }

        if (idPublic) {
            constraints.push(where("idPublic", "==", idPublic));
        }

        if (auteurId) {
            constraints.push(where("auteurId", "==", auteurId));
        }

        if (min) {
            constraints.push(where("valeur", ">=", Number(min)));
        }

        if (max) {
            constraints.push(where("valeur", "<=", Number(max)));
        }

        const q = query(
            ref,
            ...constraints,
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map(doc => ({...doc.data()}));

        return res.status(200).json({
            success: true,
            msg: req.t("success.get_note", { ns: "responses" }),
            data,
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" }),
        });
    }
};


module.exports = {getNote}