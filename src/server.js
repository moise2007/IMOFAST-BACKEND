require("dotenv").config()
const http = require("http")
const {Server} = require("socket.io")
const { app } = require("./app")
const { Currency } = require("./services/auto/monnaie.auto")
const { Users } = require("./services/auto/usersGetting")
const { demarrerAutoAnnonce } = require("./services/auto/authAnnonce")
const { initSocket } = require("./config/socket.io")
const { initCache, makeMigration } = require("./cache/cache.index")

const {db} = require("./config/firebase")
// chargement de firebase
require("./config/firebase")


const port = process.env.PORT || 3000



// creation du serveur
const server = http.createServer(app)
/* ==================================================
= service de messagerie
====================================================*/
const io = new Server(server,{
    cors : {
        origin: function(origin, callback) {
            const allowed = process.env.ALLOWED_ORIGINS?.split(",") ?? []
            if (allowed.includes(origin)) {
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
        await initCache()
        await makeMigration()
        console.log("tous est pret")

        
    }catch(err){
        console.error(err)
    }
}
startServer()

server.listen(port, '0.0.0.0', (err) => {
    if(err){
        return console.log(`une erreur incconue est survenue : ${err}`)
    }
    console.log(`Serveur démarré sur le port ${port}`)
})

/// reglagle du crash propre
server.on("error",(error)=>{
    console.log("erreur serveur : ",error.message)
})

module.exports = {server,io}
