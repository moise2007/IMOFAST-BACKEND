const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
// const csrf = require("csurf"); // voir la section CSRF plus bas

const { router } = require("./routes/index.route");
const { limitGlobal } = require("./middlewares/rateLimit");
const { sanitizeBody } = require("./middlewares/sanitize.middleware");
const i18nextMiddleware = require("./middlewares/i18next.middleware");
const notFound = require("./middlewares/NotFound.middleware");
const errorHandler = require("./middlewares/errorHandler");
const AppError = require("./errors/AppError");

// Calculé une seule fois au démarrage (et non à chaque requête)
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const localPatterns = [/^http:\/\/localhost(:\d+)?$/];

const app = express();
app.set("trust proxy", 1);

/* SÉCURITÉ DES EN-TÊTES */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginResourcePolicy: { policy: "same-origin" },
  })
);

/* HEALTH CHECK */
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "ImoFast API is running" });
});

/* CORS */
app.use(
  cors({
    origin: (origin, callback) => {
      const ok =
        !origin ||
        allowedOrigins.includes(origin) ||
        localPatterns.some((p) => p.test(origin));

      if (ok) return callback(null, true);
      callback(new AppError(`Origine non autorisée : ${origin}`, 403));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization" /*, "X-CSRF-Token" */],
    credentials: true,
  })
);

/* RATE LIMIT */
app.use(limitGlobal);

/* PARSING */
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

/* NETTOYAGE */
app.use(hpp({ whitelist: ["type", "ville", "prix", "localisation", "quatier"] }));
app.use("/api", sanitizeBody);

/* I18N*/
app.use(i18nextMiddleware);

/* CSRF */

/* ROUTES */
app.use("/api", router);

/* ERREURS */
app.use(notFound);
app.use(errorHandler);

module.exports = { app };