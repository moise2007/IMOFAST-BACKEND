const { db } = require("../config/firebase");
const { annonceCache} = require("./annonce.cache");
const { bailleursCache } = require("./bailleurs.cache");
const { bienCache } = require("./bien.cache");
const { candidatureCache } = require("./candidature.cache");
const { conversationCache } = require("./conversation.cache");
const { locatairesCache } = require("./locataires.cache");
const { messageCache } = require("./message.cache");

async function initCache(){
    await annonceCache.init()
    await messageCache.init()
    await conversationCache.init()
    await bienCache.init()
    await locatairesCache.init()
    await candidatureCache.init()
    await bailleursCache.init()
}
function autoSaveCache(){
    annonceCache.autoSave()
    messageCache.autoSave()
    conversationCache.autoSave()
    bienCache.autoSave()
    locatairesCache.autoSave()
    candidatureCache.autoSave()
    bailleursCache.autoSave()
}

async function makeMigration(){
    // recuperation des locataires
    const locatairesSnapshot = await db.collection("bailleur").get()
    const locataires = locatairesSnapshot.docs.map(doc=> doc.data())
    locataires.forEach(loc=>{
        bailleursCache.setItem({id: loc.idPublic, data: loc})
    })
}

module.exports = {initCache, autoSaveCache, makeMigration}