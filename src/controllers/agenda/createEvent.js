const { db, admin } = require("../../config/firebase")
const { Filter } = admin.firestore
const { Evenement } = require("../../models/agenda")
const { formaterObjet } = require("../../services/clearData")
const { createId } = require("@paralleldrive/cuid2")

const typesValides = ["visite", "signature", "remise_cles", "autre"]

function Verifie(data, t) {
    const missingKeys = []

    if (!data?.idBien)     missingKeys.push("idBien")
    if (!data?.idBailleur) missingKeys.push("idBailleur")
    if (!data?.type)       missingKeys.push("type")
    if (!data?.titre)      missingKeys.push("titre")
    if (!data?.start)      missingKeys.push("start")
    if (!data?.heure)      missingKeys.push("heure")
    if (!data?.duree)      missingKeys.push("duree")

    if (missingKeys.length > 0) {
        const fieldsTranslated = missingKeys
            .map(key => t(key, { ns: "errors" }))
            .join(", ")
        return {
            valid: false,
            msg: t("missing_fields", { ns: "errors", fields: fieldsTranslated })
        }
    }

    if (!typesValides.includes(data.type)) {
        return {
            valid: false,
            msg: t("invalid_type_evenement", { ns: "errors" })
        }
    }

    return { valid: true }
}

// ── Calcul de l'intersection ──────────────────────────
// Deux événements se chevauchent si :
// startA < endB ET endA > startB
function calculerIntersection(startA, endA, startB, endB) {
    return startA < endB && endA > startB
}

function calculerEnd(start, heure, duree) {
    // On construit la date complète : start + heure + duree (en minutes)
    const dateComplete = new Date(`${start}T${heure}:00`)
    const end = new Date(dateComplete.getTime() + duree * 60 * 1000)
    return { dateComplete, end }
}

const createEvenement = async (req, res) => {
    try {
        const dataNettoyer = formaterObjet(req.body)

        // ── Validation ────────────────────────────────
        const isValid = Verifie(dataNettoyer, req.t)
        if (!isValid.valid) {
            return res.status(400).json({
                success: false,
                msg: isValid.msg
            })
        }

        const auteurId = req.user.idPublic
        const { start, heure, duree, ecraser } = dataNettoyer

        // ── Calcul du début et de la fin du nouvel event ──
        const { dateComplete: newStart, end: newEnd } = calculerEnd(start, heure, duree)

        // ── Récupération des events du même bailleur ──
        const snapshot = await db.collection("evenement")
            .where("auteurId", "==", auteurId)
            .where("statut",     "!=", "annule")
            .get()

        // ── Détection du chevauchement ────────────────
        let eventEnConflit = null

        for (const doc of snapshot.docs) {
            const event     = doc.data()
            const { dateComplete: existStart, end: existEnd } = calculerEnd(
                event.start.toDate ? event.start.toDate().toISOString().split("T")[0] : event.start,
                event.heure,
                event.duree
            )

            const chevauchement = calculerIntersection(newStart, newEnd, existStart, existEnd)

            if (chevauchement) {
                eventEnConflit = { id: doc.id, ...event }
                break
            }
        }

        // ── Chevauchement détecté ─────────────────────
        if (eventEnConflit) {
            // Si ecraser = true → on annule l'ancien et on crée le nouveau
            if (ecraser === true || ecraser === "true") {
                await db.collection("evenement").doc(eventEnConflit.id).update({
                    statut:    "annule",
                    updatedAt: new Date()
                })
            } else {
                // Sinon on bloque et on retourne une erreur
                return res.status(400).json({
                    success: false,
                    msg: req.t("time_onready_used", { ns: "errors" }),
                    conflit: {
                        titre:  eventEnConflit.titre,
                        start:  eventEnConflit.start,
                        heure:  eventEnConflit.heure,
                        duree:  eventEnConflit.duree,
                    }
                })
            }
        }

        // ── Création de l'événement ───────────────────
        const idPublic  = createId()
        const evenement = new Evenement({
            ...dataNettoyer,
            auteurId ,
            idPublic: idPublic
        }).toFirebase()

        // On stocke start et end en tant que dates
        evenement.start = newStart
        evenement.end   = newEnd

        const event = (await (await db.collection("evenement").add(evenement)).get()).data()

        return res.status(201).json({
            success: true,
            event,
            msg: req.t("success.create_evenement", { ns: "responses" })
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }
}

module.exports = { createEvenement }