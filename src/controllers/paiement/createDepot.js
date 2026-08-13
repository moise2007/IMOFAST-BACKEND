const { db } = require("../../config/firebase")
const crypto = require("crypto") 


// Catalogue des offres défini côté serveur. On ne fait JAMAIS confiance à un
// montant envoyé par le client : seul le nom du plan est reçu, le montant
// est retrouvé ici.
const PLANS_ABONNEMENT = {
    mensuel:     { montant: 5000,  devise: "XAF", dureeJours: 30,  libelle: "Abonnement mensuel" },
    trimestriel: { montant: 13000, devise: "XAF", dureeJours: 90,  libelle: "Abonnement trimestriel" },
    annuel:      { montant: 45000, devise: "XAF", dureeJours: 365, libelle: "Abonnement annuel" },
}

const genererReference = () => `abo_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`


const createDepot = async(req,res)=>{
    try {
        const { plan,montant,libelle,type= "abonnement"} = req.body
        let offre = PLANS_ABONNEMENT[plan]

        if (!offre && !montant) {
            return res.status(400).json({
                success: false,
                msg: "Offre d'abonnement invalide",
            })
        }
        if(!offre){
            offre = { montant, devise: "XAF", libelle: libelle ?? "transanction sur ImoFast" }
        }



        const utilisateur = req.user

        const reference = genererReference()

        await db.collection("paiement").doc(reference).set({
            reference,
            userId: utilisateur.id,
            role: req.role,
            type,
            plan,
            montant: offre.montant,
            devise: offre.devise,
            dureeJours: offre.dureeJours,
            statut: "en_attente",
            createdAt: new Date(),
        })

        const reponseNotchPay = await fetch("https://api.notchpay.co/payments/initialize", {
            method: "POST",
            headers: {
                "Authorization": process.env.PUBLIC_KEY_NOTCHPAY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                amount: offre.montant,
                currency: offre.devise,
                reference,
                email: req.user.email,
                description: offre.libelle,
                callback: `${process.env.FRONT_URL_NOTCHPAY}`,
                metadata: {
                    userId: utilisateur.id,
                    role: req.role,
                    plan,
                },
            }),
        })

        const data = await reponseNotchPay.json()

        if (!reponseNotchPay.ok || !data?.authorization_url) {
            await db.collection("paiement").doc(reference).update({
                statut: "echec",
                erreur: data?.message || "Réponse NotchPay invalide",
            })
            return res.status(502).json({
                success: false,
                msg: data?.message ?? "Impossible d'initier le paiement, veuillez réessayer",
            })
        }

        return res.status(200).json({
            success: true,
            msg: "Paiement initié",
            reference,
            authorization_url: data.authorization_url,
        })
    } catch (err) {
        console.error("Erreur initiation paiement abonnement :", err)
        return res.status(500).json({
            success: false,
            msg: "Une erreur est survenue, veuillez réessayer plus tard",
        })
    }
}

module.exports = {createDepot}