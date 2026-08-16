const {createId} = require("@paralleldrive/cuid2")
const jwt = require("jsonwebtoken");
const { db, admin } = require("./firebase");
const { Message } = require("../models/message");
const { Users } = require("../services/auto/usersGetting");
const {Filter} = admin.firestore
const cookie = require("cookie")
const cookieParser = require("cookie-parser")




async function createMessage(msg,receiverId){
    try{
        const messageFireBase = new Message(msg).toFirebase()
        // verification de l'existance de la conversation
        const conversationSnapshot = await db.collection('conversation')
            .where("idPublic","==",msg.conversationId)
            .limit(1).get()
        if(conversationSnapshot.empty){
            return {success: false}
        }

        // creation du message 
        await db.collection("message").add(messageFireBase)

        // modifie le dernier message de la conversation
        await conversationSnapshot.docs[0].ref.update({
            "dernierMessage": {
                type:messageFireBase.type,
                createdAt: messageFireBase.createdAt,
                contenu:  messageFireBase.contenu,
                idAuteur:  messageFireBase.auteurId,
            },
            [`nonLus.${receiverId}`]: admin.firestore.FieldValue.increment(1),
            "updatedAt": admin.firestore.Timestamp.now()
        })

        if(messageFireBase.type == "lien_annonce"){
            const annonceSnaphot  =await db.collection("annonce")
            .where("idPublic","==",messageFireBase.lien.idPublic)
            .limit(1).get()

            if(!annonceSnaphot.empty){
                annonceSnaphot.docs[0].ref.update({
                    "statistiques.partager": admin.firestore.FieldValue.increment(1)
                })
            }
        }


        return {success: true,message: messageFireBase,conversation: conversationSnapshot.docs[0].ref}
    }
    catch(err){
        console.log(err)
        return {success: false,conversation: null}
    }
    
}

async function deleteMessage(id,auteurId,isLast){
    try{
        // recuperation du message
        const messageSnapsot = await db.collection("message")
            .where(Filter.and(
                Filter.where("idPublic","==",id),
                Filter.where("auteurId","==",auteurId)
            ))
            .limit(1).get()

        if(messageSnapsot.empty){
            throw new Error()
        }
        const messageDoc = messageSnapsot.docs[0]

        await messageDoc.ref.update({
            supprime: true,
            contenu: "message supprimé",
            type: "texte"
        })

        // verification de l'existance de la conversation
        const conversationId = messageDoc.data().conversationId
        const conversationSnapshot = await db.collection('conversation')
            .where("idPublic","==",conversationId)
            .limit(1).get()

        const conversation = conversationSnapshot.docs[0].ref
        if(isLast){
            // modifie le dernier message de la conversation
            await conversation.update({
                ["dernierMessage.contenu"]: "message supprimé",
                ["dernierMessage.type"]:"texte",
                ["updatedAt"]: admin.firestore.Timestamp.now()
            })
        }

        return {success: true,conversation}
    }
    catch(err){
        console.log(err)
        return {success: false,conversation: null}
    }
    
}

/**
 * Initialise les événements Socket.IO.
 *
 * @param {import("socket.io").Server} io - Instance du serveur Socket.IO.
 */
function initSocket(io){

    io.use(async(socket,next)=>{
        // recuperation du cookie
        const cookies = socket.handshake.headers.cookie
        if (!cookies) {
            return next(new Error("Non authentifié"));
        }

        const parsed = cookie.parse(cookies)
        const cookiesSigned = parsed?.token
        const token = cookieParser.signedCookie(cookiesSigned,process.env.COOKIE_SECRET)
        // decode le cookie recu
        let decoded
        try{
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        }
        catch(err){
            console.log({err})
            return next(new Error("Non authentifié"));
        }
        
        //verification de la presence de l'id de la session dans le cookie
        const sessionId = decoded?.idsession
        if(!sessionId){
            return next(new Error("Non authentifié"));
        }

        //verification de l'existence de la session
        const sessionDoc = await db.collection("session").doc(sessionId).get()
        if (!sessionDoc.exists) {
            return next(new Error("Non authentifié"));
        }

        //verification de expiration
        const {expireAt} = sessionDoc.data()
        if(new Date(expireAt) < new Date()){
            await db.collection('session').doc(sessionId).delete()
            return next(new Error("session expirée veuillez vous reconnecter"));
        }

        //recuperation de utilisateur
        const userId = sessionDoc.data().userId
        if(!userId){
            return next(new Error("utilisateur inexistant"));
        }

        if(!["locataire","bailleur","admin"].includes(socket.handshake.auth.role)){
            return next(new Error("le role de l'utilisateur es invalide"));
        }
        const userDoc = await db.collection(socket.handshake.auth.role).doc(userId).get()
        if(!userDoc.exists){
            return next(new Error("utilisateur inexistant"))
        }
        
        // modification de la dernierConnexion
        await db.collection(socket.handshake.auth.role).doc(userId).update({
            "lastConnexion": admin.firestore.Timestamp.now(),
            "enligne": true
        })

        const userData = {id:userDoc.id,...userDoc.data()}
        if(!(userData.verification?.emailVerifie || userData.verification?.telephoneVerifie)){
            return next(new Error("Veuillez vérifier votre compte avant de continuer"))
        }

        //injestion dans la requette
        socket.user = userData
        socket.role = socket.handshake.auth.role

        next()
    })

    // ================= SOCKET =================
    io.on("connection",(socket)=>{
        const userId = socket.user.idPublic;
        console.log(userId)
        socket.join(userId);

        //recuperation des utilisateurs
        const users = Users.COMPTE_CACHE[socket.role == "bailleur" ? "locataire" : "bailleur"].map(user=>user?.idPublic)
        users.forEach(user=> {
            if(user){
                io.to(user).emit("userConnected",{
                    idPublic: userId
                })
            }
            
        });

        //envoie des messages
        socket.on("sendMessage",async(data,callback)=>{
            const {conversationId, type, contenu,  medias, lien, repondsA, receiverId,idTemporaire, autreParticipant
            } = data
            const message = {conversationId, auteurId:userId, type, contenu,idTemporaire,  medias, lien, idPublic: createId(), repondsA}
            try{
                if(!conversationId || !userId || !receiverId || !message.idPublic){
                    throw new Error("")
                }
                const response = await createMessage(message,receiverId)
                let estConnecter = false
                if(response.success){
                    const room = io.sockets.adapter.rooms.get(receiverId)
                    estConnecter  = Boolean(room && room.size)
                    if(estConnecter){
                        const messageReceiver = response.message
                        let conversation = null
                        if(response.conversation){
                            conversation = (await response.conversation.get()).data()
                        }
                        io.to(receiverId).emit(
                            "newMessage", 
                            {message: messageReceiver,conversation: {...conversation,autreParticipant}},
                            (confirmation) => {
                            }
                        )
                        io.to(userId).emit("successVuMessages",{idPublic: receiverId})
                    }
                }

                if(!response.success){
                    throw new Error("erreur d'enregistrement")
                }
                callback({
                        success: response.success,
                        message: {...response.message,idTemporaire},
                    })
                
            }
            catch(err){
                callback({
                    success: false,
                    message: null
                })
            }
            
        })

        //suppresion des messages
        socket.on("deleteMessage",async({id,receiverId,isLast=false},callback)=>{
            try{
                const response = await deleteMessage(id,userId,isLast)
                let estConnecter = false
                if(receiverId && response.success){
                    const room = io.sockets.adapter.rooms.get(receiverId)
                    estConnecter  = Boolean(room && room.size)
                    if(estConnecter){
                        let conversation = null
                        if(response?.conversation){
                            conversation = (await response.conversation.get()).data()
                        }
                        io.to(receiverId).emit(
                            "successDeleteMessage", 
                            {success: true,conversation,messageId: id},
                            (confirmation) => {
                            }
                        )
                    }
                }

                if(!response.success){
                    throw new Error("erreur d'enregistrement")
                }
                callback({
                        success: response.success,
                        conversation: null
                    })
                
            }
            catch(err){
                callback({
                    success: false,
                    conversation: null
                })
            }
            
        })

        //chargement de la conversation
        socket.on("succesLoadMessages",({idPublic})=>{
            setTimeout(()=>{
                io.to(idPublic).emit("successVuMessages",{idPublic})
            },1000)
        })

        socket.on("disconnect",()=>{
            setTimeout(async()=>{
                const room = io.sockets.adapter.rooms.get(userId)
                const estConnecter  = Boolean(room && room.size)

                if(estConnecter) return

                await db.collection(socket.role).doc(socket.user.id).update({
                    "lastConnexion": admin.firestore.Timestamp.now(),
                    "enligne": false
                })

                users.forEach(user=> {
                    if(user){
                        io.to(user).emit("userDisconnected",{
                            idPublic: userId
                        })
                    }
                    
                });
            },60000)
            

            console.log( "🔴 Déconnecté:",socket.id );

        });
    });

}
module.exports = {initSocket}







