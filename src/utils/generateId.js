const { createId } = require("@paralleldrive/cuid2")

const PREFIXES = { 
    user: "user",
    locataire: "loc",
    bailleur: "bai",
    session: "ses",
    logement: "log",
    annonce: "ann",
    media: "med",
    message: "msg",
    notification: "not",
    conversation: "con",
    contrat: "ctr",
    note: "note",
    paiement: "pay",
}

const generateId = (type = "user", isAnonymous=false)=>{

    const prefix = isAnonymous ? "Anm" : PREFIXES[type] ?? "ERR"
    const radical = createId()
    const now = new Date()
    return prefix  + "_" + radical +  "_" + now.getFullYear()
}

module.exports = {generateId}