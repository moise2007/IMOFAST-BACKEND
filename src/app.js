const express = require("express")
const { router } = require("./routes/index.route")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const { limit100, limitGlobal } = require("./middlewares/rateLimit")
const hpp = require("hpp")
const helmet = require("helmet")
const { sanitizeBody } = require("./middlewares/sanitize.middleware")
const i18nextMiddleware= require("./middlewares/i18next.middleware")
const { Currency } = require("./services/auto/monnaie.auto")
const { convertirEnFCFA } = require("./utils/devise")


const app = express()
app.set("trust proxy", 1)


//securation avec helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc:  ["'self'"],
            objectSrc:  ["'none'"],
        }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginResourcePolicy: { policy: "same-origin" },
}))

// permet a d'autre domaine comme notre frontend d'avoir access au backend
app.use(cors({
    origin: function(origin, callback) {
            const allowed = process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) ?? []
            const localPatterns = [
                /^http:\/\/localhost(:\d+)?$/,
                /^http:\/\/127\.0\.0\.1(:\d+)?$/,
                /^http:\/\/172\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
                /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
            ]
            if (!origin || allowed.includes(origin) || localPatterns.some(p => p.test(origin))) {
                callback(null, true)
            } else {
                callback(new Error(`Origine non autorisée : ${origin}`))
            }
        },
    methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization',/*  "X-CSRF-Token" */],
    credentials: true
}));
app.use(limitGlobal)

// limation du body
app.use(express.json({ limit: "10kb" }))
app.use(express.urlencoded({ extended: true, limit: "10kb" }))

app.use(i18nextMiddleware)
app.use(cookieParser(process.env.COOKIE_SECRET))



//securisation des params des router
app.use(hpp({
    whitelist : ["type","ville","prix","localisation","quatier"],
}))
















// laissaon des routes a l'application 
app.use("/api",sanitizeBody,router)
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ImoFast API is running"
  });
});

// ============================== EN production ==========================
// const csrfProtection = csrf({ cookie: { httpOnly: true, secure: true } })
// app.use(csrfProtection)

module.exports = {app}