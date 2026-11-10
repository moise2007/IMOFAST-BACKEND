import { createId } from "@paralleldrive/cuid2"

const PREFIXES = { 
    user: "user",
    locataire: "loc",
    bailleur: "bai",
    session: "ses",
    logement: "log",
    media: "med",
    message: "msg",
    notification: "not",
    conversation: "con",
    contrat: "ctr",
    paiement: "pay",
}

export const generateId = (type = "user", isAnonymous=false)=>{

    const prefix = isAnonymous ? "Anm" : PREFIXES[type] ?? "ERR"
    const radical = createId()
    const now = new Date()
    return prefix  + radical + now.getFullYear()
}