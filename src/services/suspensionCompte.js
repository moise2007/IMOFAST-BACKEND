const  {db, admin}  = require("../config/firebase");


async function susprendreCompte(id,role,field){
    await db.collection(role).doc(id).update({
        "status": "suspendus",
        ...field,
        "finSuspension": admin.firestore.Timestamp.fromMillis( Date.now()+1000*60*60*24*7)
    })
}

module.exports = {susprendreCompte}