import { createId } from "@paralleldrive/cuid2"

const PREFIXES = { 
    user: "user",
    locataire: "loc",
    bailleur: "bai",
    session: "ses"
}

export const genenrateId = (type = "user", isAnomyme)=>{

    const prefixe = isAnomyme ? "Anm" : PREFIXES[type] ?? "ERR"
    const radicale = createId()
    const now = new Date()
    return prefixe  + radicale + now.getFullYear()
}