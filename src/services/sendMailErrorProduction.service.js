const { sendEmail } = require("./mail.service");

/**
 * Génère le HTML d'un mail d'erreur en production.
 * @param {Object} params
 * @param {Error} params.error Erreur rencontrée
 * @param {Request} params.req Requête Express
 * @param {Number} [params.statusCode=500] Code HTTP
 * @param {String} [params.server="Production"] Environnement
 * @returns {String} HTML du mail
 */
const generateProductionErrorEmail = ({
    error,
    req,
    statusCode = 500,
    server = "Production"
}) => {
    const timestamp = new Date().toISOString();
    const method = req?.method || "Inconnu";
    const route = req?.originalUrl || req?.url || "Inconnue";
    const ip = req?.ip || "Inconnue";
    const userAgent = req?.get?.("user-agent") || "Inconnu";
    const errorMessage = error.message || "Erreur inconnue";
    const stack = error?.stack || "Stack trace indisponible";

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Erreur Production - ImoFast</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#1f2937">
<div style="max-width:680px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.08)">
<div style="background:#dc2626;padding:24px 30px;color:#fff">
<h1 style="margin:0;font-size:24px">🚨 Erreur en production</h1>
<p style="margin:8px 0 0;font-size:14px">Une erreur a été détectée sur l'API ImoFast.</p>
</div>
<div style="padding:30px">
<h2>Informations sur l'erreur</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold">Environnement</td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${server}</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold">Date</td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${timestamp}</td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold">Méthode</td><td style="padding:10px;border-bottom:1px solid #e5e7eb"><code>${method}</code></td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold">Route</td><td style="padding:10px;border-bottom:1px solid #e5e7eb"><code>${route}</code></td></tr>
<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:bold">Code HTTP</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:bold">${statusCode}</td></tr>
</table>
<h2 style="margin-top:30px">Message d'erreur</h2>
<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:15px;border-radius:6px">
<p style="margin:0;color:#991b1b;font-family:monospace;font-size:14px">${errorMessage}</p>
</div>
<h2 style="margin-top:30px">Stack trace</h2>
<div style="background:#111827;color:#e5e7eb;padding:18px;border-radius:8px;overflow-x:auto">
<pre style="margin:0;white-space:pre-wrap;font-family:Consolas,Monaco,monospace;font-size:12px">${stack}</pre>
</div>
<h2 style="margin-top:30px">Requête</h2>
<div style="background:#f9fafb;padding:15px;border-radius:8px">
<p><strong>URL :</strong> ${route}</p>
<p><strong>IP :</strong> ${ip}</p>
<p><strong>User-Agent :</strong> ${userAgent}</p>
</div>
<div style="margin-top:30px;padding:15px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">
<p style="margin:0;font-size:13px;color:#92400e">⚠️ Notification automatique de l'API ImoFast.</p>
</div>
</div>
<div style="background:#f9fafb;padding:18px 30px;text-align:center;font-size:12px;color:#6b7280">ImoFast API — Monitoring Production</div>
</div>
</body>
</html>`;
};

/**
 * permet d'envoyer un mail pour  signaler l'erreur au producteur
 * @param {*} param0 
 * @param {String} param0.title - titre du mail
 * @param {Error} param0.error - object de l'erreur produite
 * @param {Number} [param0.statusCode=500] - code du status de la requette
 */
const sendEmailToAlertError = async({title,error,req, statusCode})=>{
    try{
        if(process.env.etat != "production"){
            return
        }
        //envoie du mail
        await sendEmail(
            "bakomenm@gmail.com",
            null,
            generateProductionErrorEmail({
                error,
                req, 
                statusCode
            }),
            title
        );
    }
    catch(err){
        console.log("erreur lie a l'envoie du mail d'erreur au producteur");
    }
}

module.exports = {sendEmailToAlertError};