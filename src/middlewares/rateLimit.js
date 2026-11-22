// middlewares/rateLimit.js
const rateLimit = require("express-rate-limit")

// Limite globale
exports.limitGlobal = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    message: { success: false, msg: "Trop de requêtes, réessayez plus tard" }
})

// Limite stricte pour auth
exports.limitAuth = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,   // 10 tentatives max
    message: { success: false, msg: "Trop de tentatives, réessayez dans 15 minutes" }
})

// Limite upload
exports.limitUpload = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: { success: false, msg: "Limite d'upload atteinte" }
})