const { db } = require("../../config/firebase")


const getAllAlertes = async(req,res)=>{
    try{
        const role = req.role
        const auteurId = req.user?.idPublic
        const {lastId,createAt}=req.query
        let queryAlertes = db.collection("alerte")

        if(role == "bailleur"){
            queryAlertes = queryAlertes.where("bailleurId",'array-contains',auteurId)
        }
        if(role == "locataire"){
            queryAlertes = queryAlertes.where("auteurId","==",auteurId)
        }
            
        if(lastId && lastId!="null" && lastId != "undefined"){
            const lastAlerteSnapshot = await db.collection("alerte")
            .where("idPublic","==",lastId).get()

            if(!lastAlerteSnapshot.empty){
                const lastdoc = lastAlerteSnapshot.docs[0]
                queryAlertes = queryAlertes.startAfter(lastdoc)
            }
        }
            // queryAlertes = queryAlertes.orderBy('createAt','desc')
            const alertesSnapshot = await queryAlertes.limit(30).get()
            
        if(alertesSnapshot.empty){
            return res.status(200).json({
                success: true,
                alertes: [],
                hasMore: false,
                msg: " les alertes ont charges avec succèss."
            })
        }
        const alertes = alertesSnapshot.docs.map(doc=>doc.data())
        return res.status(200).json({
            success: true,
            alertes,
            hasMore: alertes.length == 30,
            msg: " les alertes ont charges avec succèss."
        })
        
    }
    catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            alertes:null,
            msg: "une erreur inconnu est survenue."
        })
    }
    
}

module.exports = {getAllAlertes}