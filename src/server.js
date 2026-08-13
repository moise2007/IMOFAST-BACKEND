require("dotenv").config()
const http = require("http")
const {Server} = require("socket.io")

const { app } = require("./app")
const { handle } = require("i18next-http-middleware/cjs")
const { Currency } = require("./services/auto/monnaie.auto")
const { convertirEnFCFA } = require("./utils/devise")
const { Users } = require("./services/auto/usersGetting")
const { demarrerAutoAnnonce } = require("./services/auto/authAnnonce")
const { initSocket } = require("./config/socket.io")

const port = process.env.PORT || 3000

// chargement de firebase
require("./config/firebase")

// creation du serveur
const server = http.createServer(app)
/* ==================================================
= service de messagerie
====================================================*/
const io = new Server(server,{
    cors : {
        origin: function(origin, callback) {
            const allowed = process.env.ALLOWED_ORIGINS?.split(",") ?? []
            if (!origin || allowed.includes(origin)) {
                callback(null, true)
            } else {
                callback(new Error(`Origine non autorisée : ${origin}`))
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
        credentials: true
    }
})
initSocket(io)


async function startServer(){
    try{
        /*============================================
        = service l'automatisation
        =============================================*/
        await Currency.autoUpdateCurrency()
        await Users.getCacheContact()
        demarrerAutoAnnonce()


       

        // lancement du serveur (0.0.0.0 = accessible depuis le réseau local)
        server.listen(port, "0.0.0.0", () => {
            console.log(`L'application a démarré sur : http://0.0.0.0:${port}`);
            console.log(`API contact : POST http://172.20.10.3:${port}/api/contact`);

            if (process.env.MAIL_USER) {
                const { verifyMailTransport } = require("./config/mail.config");
                verifyMailTransport()
                    .then(() => console.log("✓ Configuration SMTP vérifiée"))
                    .catch((err) => console.warn("⚠ SMTP non configuré:", err.message));
            } else {
                console.warn("⚠ MAIL_USER absent — le formulaire contact ne pourra pas envoyer d'emails");
            }
        });


    }catch(err){
        console.error(err)
    }
}
startServer()

/// reglagle du crash propre
server.on("error",(error)=>{
    console.log("error",(err)=>{
        console.log("erreur serveur : ",err.message)
    })
})

module.exports = {server,io}
