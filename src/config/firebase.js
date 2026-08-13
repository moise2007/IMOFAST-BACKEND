const admin = require("firebase-admin")
const serviceAccount = require("../../firebase-config.json")

admin.initializeApp({
    credential :admin.credential.cert(serviceAccount)
})

const db =admin.firestore()
const auth = admin.auth()
db.settings({ ignoreUndefinedProperties: true });

console.log("firebase a ete bien initialiser")

module.exports = {db,auth,admin}


