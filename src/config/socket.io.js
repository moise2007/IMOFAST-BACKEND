const {createId} = require("@paralleldrive/cuid2")
const {notifyNewMessage} = require("../notifications/push/messagePush");
const {messageNotificationTitle} = require("../notifications/messageTitle");
const { authenticateSocket } = require("../sockets/auth");
const { db, admin } = require("./firebase");
const { Message } = require("../models/message");
const {Filter} = admin.firestore

async function getConversationForUser(conversationId, userId) {
    if (typeof conversationId !== "string" || !conversationId.trim()) return null;
    const snapshot = await db.collection("conversation")
        .where("idPublic", "==", conversationId)
        .limit(1).get();
    if (snapshot.empty) return null;
    const document = snapshot.docs[0];
    const data = document.data();
    if (!data.idParticipants?.includes(userId) || data.delete?.[userId]) return null;
    return {
        reference: document.ref,
        otherId: data.idParticipants.find(id => id !== userId),
    };
}

async function getConversationPartners(userId, role) {
    if (role !== "bailleur" && role !== "locataire") return [];
    const field = role === "bailleur" ? "bailleurId" : "locataireId";
    const snapshot = await db.collection("conversation").where(field, "==", userId).get();
    return [...new Set(snapshot.docs.map(document => {
        const data = document.data();
        const otherId = data.idParticipants?.find(id => id !== userId);
        return otherId && !data.delete?.[userId] && !data.delete?.[otherId] ? otherId : null;
    }).filter(Boolean))];
}



async function createMessage(msg,receiverId){
    try{
        if (msg.type === "galerie" && (
            !Array.isArray(msg.medias) || msg.medias.length < 2 || msg.medias.length > 10 ||
            msg.medias.some(media => !["image", "video"].includes(media?.type) ||
                typeof media?.url !== "string" || !/^https?:\/\//i.test(media.url))
        )) return {success: false};
        const messageFireBase = new Message(msg).toFirebase()
        // verification de l'existance de la conversation
        const conversationSnapshot = await db.collection('conversation')
            .where("idPublic","==",msg.conversationId)
            .limit(1).get()
        if(conversationSnapshot.empty){
            return {success: false}
        }
        const conversation = conversationSnapshot.docs[0].data();
        if (!conversation.idParticipants?.includes(msg.auteurId) ||
            !conversation.idParticipants?.includes(receiverId) ||
            receiverId === msg.auteurId || conversation.delete?.[msg.auteurId]) {
            return {success: false};
        }

        await require('../repositories/message.repository').create(messageFireBase, {
            role: msg.auteurId === conversation.bailleurId ? 'bailleur' : 'locataire',
            conversationDocumentId: conversationSnapshot.docs[0].id, conversation,
        });

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

    io.use(authenticateSocket);
    io.use(async (socket, next) => {
        try {
            await db.collection(socket.role).doc(socket.user.id).update({
                lastConnexion: admin.firestore.Timestamp.now(),
                enligne: true,
            });
            next();
        } catch (error) { next(error); }
    });

    // ================= SOCKET =================
    io.on("connection",(socket)=>{
        const userId = socket.user.idPublic;
        socket.join(userId);
        const firstConnection = io.sockets.adapter.rooms.get(userId)?.size === 1;
        const partnerIdsPromise = getConversationPartners(userId, socket.role).catch(error => {
            console.error("Présence des conversations :", error);
            return [];
        });
        const joinedConversations = new Map();
        if (firstConnection) {
            partnerIdsPromise.then(ids => ids.forEach(id =>
                io.to(id).emit("presenceChanged", {idPublic: userId, enligne: true})
            ));
        }

        socket.on("joinConversation", async ({conversationId} = {}, callback) => {
            try {
                const info = await getConversationForUser(conversationId, userId);
                if (!info?.otherId) return callback?.({success: false});
                joinedConversations.set(conversationId, info);
                socket.join(`conversation:${conversationId}`);
                callback?.({
                    success: true,
                    otherOnline: Boolean(io.sockets.adapter.rooms.get(info.otherId)?.size),
                });
            } catch (error) {
                console.error("Ouverture de conversation :", error);
                callback?.({success: false});
            }
        });

        socket.on("leaveConversation", ({conversationId} = {}, callback) => {
            if (!joinedConversations.has(conversationId)) return callback?.({success: true});
            socket.to(`conversation:${conversationId}`).emit("typingChanged", {conversationId, userId, isTyping: false});
            socket.leave(`conversation:${conversationId}`);
            joinedConversations.delete(conversationId);
            callback?.({success: true});
        });

        socket.on("typingChanged", ({conversationId, isTyping} = {}, callback) => {
            if (!joinedConversations.has(conversationId) || typeof isTyping !== "boolean") return callback?.({success: false});
            socket.to(`conversation:${conversationId}`).emit("typingChanged", {conversationId, userId, isTyping});
            callback?.({success: true});
        });

        socket.on("markConversationRead", async ({conversationId, messageId} = {}, callback) => {
            const info = joinedConversations.get(conversationId);
            if (!info) return callback?.({success: false});
            try {
                const snapshot = messageId
                    ? await db.collection("message").where("idPublic", "==", messageId).limit(1).get()
                    : await db.collection("message").where("conversationId", "==", conversationId).get();
                const unread = snapshot.docs.filter(document => {
                    const message = document.data();
                    return message.conversationId === conversationId && message.auteurId === info.otherId && message.lu === false;
                });
                for (let index = 0; index < unread.length; index += 400) {
                    const batch = db.batch();
                    unread.slice(index, index + 400).forEach(document => batch.update(document.ref, {lu: true}));
                    await batch.commit();
                }
                await info.reference.update({[`nonLus.${userId}`]: 0});
                io.to(info.otherId).emit("messagesRead", {conversationId, readBy: userId, readAt: Date.now()});
                callback?.({success: true});
            } catch (error) {
                console.error("Lecture de conversation :", error);
                callback?.({success: false});
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
                    const notificationTitle = messageNotificationTitle(socket.user);
                    void notifyNewMessage({db, recipientId: receiverId, recipientRole: socket.role === "locataire" ? "bailleur" : "locataire", conversationId, title: notificationTitle, sender: socket.user});
                    void Promise.resolve().then(() => require("../services/notification.service").createNotification({
                        destinataireId: receiverId,
                        typeDestinataire: socket.role === "locataire" ? "bailleur" : "locataire",
                        type: "message",
                        cibleId: conversationId,
                        typeCible: "conversation",
                        titreKey: 'backend.push.messageTitle',
                        message: typeof response.message?.contenu === "string" && response.message.contenu.trim()
                            ? response.message.contenu.slice(0, 160)
                            : undefined,
    messageKey: 'backend.push.messageBody',
                    })).catch((error) => console.error("Notification du message :", error));
                    const room = io.sockets.adapter.rooms.get(receiverId)
                    estConnecter  = Boolean(room && room.size)
                    if(estConnecter){
                        const messageReceiver = response.message
                        let conversation = null
                        if(response.conversation){
                            conversation = (await response.conversation.get()).data()
                        }
                        io.to(receiverId).emit("newMessage", {message: messageReceiver, conversation: {...conversation, autreParticipant}})
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

        socket.on("disconnecting", () => {
            joinedConversations.forEach((_, conversationId) => {
                socket.to(`conversation:${conversationId}`).emit("typingChanged", {conversationId, userId, isTyping: false});
            });
        });
        socket.on("disconnect",()=>{
            setTimeout(async()=>{
                const room = io.sockets.adapter.rooms.get(userId)
                const estConnecter  = Boolean(room && room.size)

                if(estConnecter) return
                try {
                    await db.collection(socket.role).doc(socket.user.id).update({
                        lastConnexion: admin.firestore.Timestamp.now(),
                        enligne: false,
                    });
                    const ids = await getConversationPartners(userId, socket.role);
                    ids.forEach(id => io.to(id).emit("presenceChanged", {idPublic: userId, enligne: false}));
                } catch (error) {
                    console.error("Déconnexion de la messagerie :", error);
                }
            },5000)

        });
    });

}
module.exports = {initSocket}







