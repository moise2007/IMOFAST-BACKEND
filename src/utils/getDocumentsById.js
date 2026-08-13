const{ collection, query, where, getDocs } = require("firebase/firestore")
const { db } = require("../config/firebase")

const getDocumentsByPublicIds = async (idsPublic,col)=>{
    if(!idsPublic || idsPublic.length == 0) return []
    const results = []
    const chuncks = []

    for (let i = 0; i<idsPublic.length;i+=30){
        chuncks.push(idsPublic.slice(i,i+30))
    }
    for(const chunk of chuncks){
        const snapshot = await db.collection(col).where("idPublic","in",chunk).get()
        snapshot.forEach(doc=>{
            results.push(doc.data())
        })
    }
    return results
}

module.exports = {getDocumentsByPublicIds}