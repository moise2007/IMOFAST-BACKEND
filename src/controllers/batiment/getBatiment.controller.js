const { admin, db } = require("../../config/firebase");
const { Filter } = admin.firestore;

const getBatiments = async (req, res) => {
    try {
        const { ville, quartier, nom, lastId } = req.query;

        let batimentQuery = db.collection("batiment");

        if (ville && ville !== "null") {
            batimentQuery = batimentQuery.where("localisation.ville", "==", ville);
        }

        if (quartier && quartier !== "null") {
            batimentQuery = batimentQuery.where("localisation.quartier", "==", quartier);
        }

        batimentQuery = batimentQuery.where(
            Filter.and(
                Filter.where("delete", "==", false),
                Filter.where("gestionnaires", "array-contains", req.user.idPublic)
            )
        );

        // Firestore impose que le premier orderBy corresponde au champ sur
        // lequel porte une inégalité (>=, <=). On adapte donc le tri selon
        // qu'une recherche par nom est active ou non — impossible de trier
        // par createdAt tout en filtrant par inégalité sur nom.
        const rechercheParNom = nom && nom !== "null";

        if (rechercheParNom) {
            batimentQuery = batimentQuery
                .where("nom", ">=", nom)
                .where("nom", "<=", `${nom}\uf8ff`)
                .orderBy("nom", "asc");
        } else {
            batimentQuery = batimentQuery.orderBy("createdAt", "desc");
        }

        batimentQuery = batimentQuery.limit(30);

        if (lastId && lastId !== "null") {
            const lastDoc = await db.collection("batiment").doc(lastId).get();
            if (lastDoc.exists) {
                batimentQuery = batimentQuery.startAfter(lastDoc);
            }
        }

        const batimentSnapshot = await batimentQuery.get();
        const batiments = batimentSnapshot.docs.map((doc) => doc.data());

        const lastCursor =
            batiments.length > 0
                ? batimentSnapshot.docs[batiments.length - 1].id
                : null;

        return res.status(200).json({
            success: true,
            msg: "Bâtiments chargés avec succès",
            batiments,
            lastCursor,
            hasMore: batiments.length >= 30,
        });
    } catch (err) {
        console.log("Erreur de récupération des bâtiments : " + err);
        await sendEmailToAlertError({
            title: "Erreur de récupération des bâtiments",
            error: err,
            req,
        });
        return res.status(500).json({
            success: false,
            msg: "Une erreur inconnue s'est produite",
        });
    }
};

module.exports = { getBatiments };