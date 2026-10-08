const  {db, admin}  = require("../config/firebase");


async function susprendreCompte(id,role,field,duree = 1000*60*60*24*7){
    await db.collection(role).doc(id).update({
        "status": "suspendus",
        ...field,
        "finSuspension": admin.firestore.Timestamp.fromMillis( Date.now()+duree)
    })
}

module.exports = {susprendreCompte}