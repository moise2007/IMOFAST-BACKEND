const { db } = require("../../config/firebase")

const getDemandeServiceClient = async(req,res)=>{
    try{
        const userId = req?.user?.idPublic

        if(!userId){
            return res.status(401).json({
                success:false,
                msg:"Utilisateur non authentifié"
            })
        }

        const [signalementsSnapshot,reclamationsSnapshot] = await Promise.all([
            db.collection("signalement")
                .where("userId","==",userId)
                .get(),

            db.collection("reclamation")
                .where("userId","==",userId)
                .get()
        ])

        const signalements = signalementsSnapshot.docs.map(doc=>({
            id:doc.id,
            type:"signalement",
            ...doc.data()
        }))

        const reclamations = reclamationsSnapshot.docs.map(doc=>({
            id:doc.id,
            type:"reclamation",
            ...doc.data()
        }))

        const demandes = [
            ...signalements,
            ...reclamations
        ]

        demandes.sort((a,b)=>{
            const dateA = a.createdAt?.toMillis?.() ?? 0
            const dateB = b.createdAt?.toMillis?.() ?? 0
            return dateB - dateA
        })

        return res.status(200).json({
            success:true,
            demandes,
            msg:"Vos demandes ont été récupérées avec succès."
        })

    }catch(err){
        console.log(err)

        return res.status(500).json({
            success:false,
            msg:"Nous n'avons pas pu récupérer vos demandes, réessayez plus tard."
        })
    }
}
module.exports = {getDemandeServiceClient}