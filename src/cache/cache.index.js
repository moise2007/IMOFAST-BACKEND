const { db } = require("../config/firebase");
const { annonceCache} = require("./annonce.cache");
const { bailleursCache } = require("./bailleurs.cache");
const { bienCache } = require("./bien.cache");
const { candidatureCache } = require("./candidature.cache");
const { conversationCache } = require("./conversation.cache");
const { locatairesCache } = require("./locataires.cache");
const { messageCache } = require("./message.cache");
const { bienListeCache } = require("./bien-liste.cache");
const { bailleurDataCache } = require("./bailleur-data.cache");
const { bailleurHomeCache } = require("./bailleur-home.cache");

async function initCache(){
    await annonceCache.init()
    await messageCache.init()
    await conversationCache.init()
    await bienCache.init()
    await bienListeCache.init()
    await bailleurDataCache.init()
    await bailleurHomeCache.init()
    await locatairesCache.init()
    await candidatureCache.init()
    await bailleursCache.init()
}
function autoSaveCache(){
    annonceCache.autoSave()
    messageCache.autoSave()
    conversationCache.autoSave()
    bienCache.autoSave()
    bienListeCache.autoSave()
    bailleurDataCache.autoSave()
    bailleurHomeCache.autoSave()
    locatairesCache.autoSave()
    candidatureCache.autoSave()
    bailleursCache.autoSave()
}

async function makeMigration(){
    // recuperation des locataires
    const bailleursSnapshot = await db.collection("bailleur").get()
    const bailleurs = bailleursSnapshot.docs.map(doc=> doc.data())
    bailleurs.forEach(bailleur=>{
        if(bailleur?.idPublic)bailleursCache.setItem({id: bailleur.idPublic, data: bailleur})
    })
}

module.exports = {initCache, autoSaveCache, makeMigration}
