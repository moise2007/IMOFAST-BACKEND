const { db } = require("../../config/firebase")


class Users {
    static COMPTE_CACHE = {
        bailleur: null,
        admin: null,
        locataire: null
    }
    static SIZE = {
        bailleur: null,
        locataire: null,
        admin: null,
    }
    static dernierChargement = 0
    static DUREE_CACHE = 10*60*1000

    static async compterUser(){
        try{
            const [locataireSize,bailleurSize,adminSize] = await Promise.all([
                db.collection("locataire").count().get(),
                db.collection("bailleur").count().get(),
                db.collection("admin").count().get()
            ])
            Users.SIZE.locataire = locataireSize.data().count
            Users.SIZE.bailleur = bailleurSize.data().count
            Users.SIZE.admin = adminSize.data().count
            return true
        }
        catch(err){
            console.log("auto Counting user: ",err)
            return false
        }
        
    }
    static async getUser(taille,collection){
        const allUsers = []
        let dernierDOc = null
        for(let i=0; i< taille;i+= 150){
            const query = db.collection(collection)
                .orderBy("__name__")
                .limit(150)

            if(dernierDOc){
                query.startAfter(dernierDOc)
            }

            const snapshot = await query.get()
            if(snapshot.empty) break;
            snapshot.docs.forEach(doc=>{
                allUsers.push({...doc.data()})
            })

            dernierDOc  = snapshot.docs[snapshot.docs.length - 1]

            if(snapshot.size < 150) break;
        }
        return allUsers
    }
    static async getCacheContact(){
        try{
            const maintenant = new Date()

            if(maintenant && (maintenant - Users.dernierChargement) < Users.DUREE_CACHE 
                && COMPTE_CACHE.admin && COMPTE_CACHE.bailleur && COMPTE_CACHE.locataire){
                return COMPTE_CACHE
            }
            const successGetting = await Users.compterUser()
            if(!successGetting){
                throw new Error("")
            }

            const [locataires,bailleurs, admin] = await Promise.all([
                Users.getUser(Users.SIZE.locataire,"locataire"),
                Users.getUser(Users.SIZE.bailleur,"bailleur"),
                Users.getUser(Users.SIZE.admin,"admin")
            ])
            Users.COMPTE_CACHE.admin = admin
            Users.COMPTE_CACHE.locataire = locataires
            Users.COMPTE_CACHE.bailleur = bailleurs
            Users.DUREE_CACHE = Math.max(
                10*60*1000,  
                (Users.SIZE.locataire + Users.SIZE.bailleur + Users.SIZE.admin)*20
            )
            Users.dernierChargement = new Date()
            console.log("users bien initialiser")
        }
        catch(err){
            console.log("error gettinng user : ",err)
            Users.DUREE_CACHE = 10*1000
        }
    }
}


module.exports = {Users}