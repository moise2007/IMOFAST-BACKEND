// middlewares/sanitize.js
const xss = require("xss")

// Les caractères dangereux spécifiques à Firestore
const FORBIDDEN_PATTERNS = [
    /\.\./,           // path traversal
    /\//,             // séparateur de collection
    /__.*__/,         // champs système Firestore (__name__, etc.)
]

const containsForbidden = (value) => {
    if (typeof value !== "string") return false
    if(value.startsWith("http://") || value.startsWith("https://")) return false
    return FORBIDDEN_PATTERNS.some(pattern => pattern.test(value))
}

const sanitizeValue = (value) => {
    if (typeof value === "string") {
        if(containsForbidden(value)) return ""
        return xss(value.trim())
    }
        
        
    if (Array.isArray(value))      return value.map(sanitizeValue)
    if (typeof value !== "object" || value === null) return value
    return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)])
    )
}

const sanitizeBody = (req, res, next) => {
    if (req.body)   req.body   = sanitizeValue(req.body)
    if (req.params) req.params = sanitizeValue(req.params)
    if (req.query)  req.query  = sanitizeValue(req.query)
    next()
}

module.exports = { sanitizeBody }