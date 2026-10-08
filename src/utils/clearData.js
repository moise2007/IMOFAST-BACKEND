// utils/validator.js
const xss = require("xss")

const PAYS = {
    "cameroun": {
        nom: "cameroun",
        indicatif: "+237",
        regex: /^(\+237|237)?[62][2456789][0-9]{7}$/
    }
}


const nettoyerNumero = (numero) => {
    if (typeof numero !== "string") 
        numero = String(numero)
    if(numero[0] == "6"){
        numero = `+237${numero}`
    }
    if(numero.startsWith("237")){
        numero =`+${numero}`
    }

    return numero
        .replace(/[-\s().]/g, "") 
        .trim()
}

const verifierTelephone = (numero, pays = "cm") => {
    const config = PAYS[pays]
    if (!config) return { valide: false, msg: `Pays "${pays}" non supporté` }

    const nettoye = nettoyerNumero(numero)
    const valide  = config.regex.test(nettoye)

    return {
        valide,
        numero: valide ? nettoye : null,
        msg: valide ? null : `Numéro invalide pour le ${config.nom} (ex: 6XXXXXXXX)`
    }
}

const verifierMotDePasse = (mdp) => {
    if (typeof mdp !== "string") return { valide: false, msg: "Mot de passe invalide" }

    const regles = [
        { regex: /.{8,}/,          msg: "Au moins 8 caractères" },
        { regex: /[A-Z]/,          msg: "Au moins une majuscule" },
        { regex: /[a-z]/,          msg: "Au moins une minuscule" },
        { regex: /[0-9]/,          msg: "Au moins un chiffre" },
        { regex: /[^A-Za-z0-9]/,   msg: "Au moins un symbole (!@#$...)" },
    ]

    const erreurs = regles
        .filter(r => !r.regex.test(mdp))
        .map(r => r.msg)

    return {
        valide: erreurs.length === 0,
        erreurs: erreurs.length > 0 ? erreurs : null,
        msg: erreurs.length > 0 ? erreurs.join(", ") : null
    }
}

// ── Vérificateur email ────────────────────────────────────────────────────────
const verifierEmail = (email) => {
    if (typeof email !== "string") return { valide: false, msg: "Email invalide" }

    const nettoye = email.trim().toLowerCase()
    const regex   = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
    const valide  = regex.test(nettoye)

    return {
        valide,
        email: valide ? nettoye : null,
        msg: valide ? null : "Format email invalide (ex: nom@domaine.com)"
    }
}

// ── Convertisseur chaine → chiffre ───────────────────────────────────────────
const versChiffre = (valeur) => {
    if (typeof valeur === "number") {
        return isNaN(valeur) ? null : valeur
    }
    if (typeof valeur === "string") {
        const nettoye = valeur.replace(/\s/g, "")
        if (nettoye === "") return null
        const nombre = Number(nettoye)
        return isNaN(nombre) ? null : nombre
    }
    return null
}

const formaterObjet = (valeur) => {
    if (valeur === undefined) return null
    if (valeur === "")  return null
    if (typeof valeur === "number" && isNaN(valeur)) return null

    if (Array.isArray(valeur)) {
        return valeur.map(formaterObjet)
    }

    if (typeof valeur === "object" && valeur !== null) {
        return Object.fromEntries(
            Object.entries(valeur).map(([k, v]) => [k, formaterObjet(v)])
        )
    }
    return valeur
}

module.exports = {
    verifierTelephone,
    verifierMotDePasse,
    verifierEmail,
    versChiffre,
    formaterObjet,
}