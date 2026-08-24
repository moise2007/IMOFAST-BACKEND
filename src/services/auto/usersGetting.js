const { db } = require("../../config/firebase")


class Users {
    static COMPTE_CACHE = {
        bailleur: null,
        admin: null,
        locataire: null,
        annonce: null,
        bien: null
    }
    static SIZE = {
        bailleur: null,
        locataire: null,
        admin: null,
        annonce: null,
        bien: null
    }
    static dernierChargement = 0
    static DUREE_CACHE = 10*60*1000

    static async compterUser(){
        try{
            const [locataireSize,bailleurSize,adminSize,annonceSize,bienSize] = await Promise.all([
                db.collection("locataire").count().get(),
                db.collection("bailleur").count().get(),
                db.collection("admin").count().get(),
                db.collection("annonce").count().get(),
                db.collection("bien").count().get()
            ])
            Users.SIZE.locataire = locataireSize.data().count
            Users.SIZE.bailleur = bailleurSize.data().count
            Users.SIZE.admin = adminSize.data().count
            Users.SIZE.annonce = annonceSize.data().count
            Users.SIZE.bien = bienSize.data().count
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
    static async getCacheContact() {
        try {
            const now = Date.now();

            // Cache valide
            if (
                Users.dernierChargement &&
                now - Users.dernierChargement < Users.DUREE_CACHE &&
                Users.COMPTE_CACHE?.locataire &&
                Users.COMPTE_CACHE?.bailleur &&
                Users.COMPTE_CACHE?.admin &&
                Users.COMPTE_CACHE?.annonce &&
                Users.COMPTE_CACHE?.bien
            ) {
                return Users.COMPTE_CACHE;
            }

            // Mise à jour des compteurs
            if (!(await Users.compterUser())) {
                throw new Error("Impossible de compter les utilisateurs");
            }

            // Récupération parallèle des dernières données
            const [
                locataires,
                bailleurs,
                admins,
                annonces,
                biens
            ] = await Promise.all([
                Users.getUser(10, "locataire"),
                Users.getUser(10, "bailleur"),
                Users.getUser(10, "admin"),
                Users.getUser(10, "annonce"),
                Users.getUser(10, "bien")
            ]);

            // Mise en cache
            Users.COMPTE_CACHE = {
                locataire: locataires,
                bailleur: bailleurs,
                admin: admins,
                annonce: annonces,
                bien: biens,

                // KPI
                totalLocataires: Users.SIZE.locataire,
                totalBailleurs: Users.SIZE.bailleur,
                totalAdmins: Users.SIZE.admin,
                totalUtilisateurs:
                    Users.SIZE.locataire +
                    Users.SIZE.bailleur +
                    Users.SIZE.admin,

                totalAnnonces: Users.SIZE.annonce ?? 0,
                totalBiens: Users.SIZE.bien ?? 0
            };

            Users.dernierChargement = now;
            Users.DUREE_CACHE = 10 * 60 * 1000;
            console.log("users initialiser")

            return Users.COMPTE_CACHE;

        } catch (error) {
            console.error("Erreur getCacheContact :", error);
            Users.DUREE_CACHE = 10 * 1000;
            throw error;
        }
    }
}


module.exports = {Users}