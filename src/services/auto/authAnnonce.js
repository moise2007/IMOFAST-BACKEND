const { admin, db } = require("../../config/firebase")
const cron = require("node-cron") 

let enCours = false

async function traiterToutesLesAnnonces({ tailleLot = 200, delai = 100 }) {
    if (enCours) {
        console.warn(" autoAnnonce déjà en cours, exécution ignorée")
        return
    }
    enCours = true

    let lastDocument = null
    let total = 0
    let lot = 0

    try {
        while (true) {
            let query = db.collection("annonce")
                .orderBy(admin.firestore.FieldPath.documentId())
                .limit(tailleLot)

            if (lastDocument) {
                query = query.startAfter(lastDocument)
            }

            const snapshot = await query.get()
            if (snapshot.empty) break

            const batch = db.batch()
            let opsDansLot = 0

            for (const doc of snapshot.docs) {
                const champsAMettreAJour = construireMiseAJour(doc) 
                if (champsAMettreAJour) {
                    batch.update(doc.ref, champsAMettreAJour)
                    opsDansLot++
                }
            }

            if (opsDansLot > 0) {
                await batch.commit()
                total += opsDansLot
            }

            lot++
            console.log(`Lot ${lot} : ${opsDansLot} mis à jour (total : ${total})`)

            lastDocument = snapshot.docs[snapshot.docs.length - 1]
            if (snapshot.size < tailleLot) break

            if (delai > 0) {
                await new Promise((r) => setTimeout(r, delai))
            }
        }

        console.log(`✅ Terminé : ${total} documents mis à jour sur ${lot} lots.`)
    } catch (err) {
        console.error("❌ Erreur autoAnnonce :", err)
    } finally {
        enCours = false
    }
}

function construireMiseAJour(doc) {
    const data = doc.data()
    if (data.dateExpiration && data.dateExpiration.toDate() < new Date() && data.status === "publier") {
        return { status: "expirer" }
    }
    return null
}

function demarrerAutoAnnonce({ tailleLot = 200, delai = 100 } = {}) {
    cron.schedule("0 3 * * *", async() => {
        await traiterToutesLesAnnonces({ tailleLot, delai })
    })
}

module.exports = { demarrerAutoAnnonce, traiterToutesLesAnnonces }