const { db, admin } = require("../../config/firebase")
const { susprendreCompte } = require("../../services/suspensionCompte")
const timeStamp = admin.firestore.Timestamp


const Jours = {
    mensuel: 30,
    trimestriel: 90,
    annuel:365,
}
const searchStatusPaiement = async(req,res)=>{
    try{
        const reponse = await fetch(`https://api.notchpay.co/payments/${req.body.reference}`, {
            headers: { "Authorization": process.env.PUBLIC_KEY_NOTCHPAY },
        })
        const data = await reponse.json()
        const status = data?.transaction?.status

        if(status == "complete"){
            await db.collection("paiement").doc(data?.transaction?.merchant_reference).update({
                statut: data?.transaction?.status
            })
            const paiement = (await db.collection("paiement").doc(data?.transaction?.merchant_reference).get()).data()

            const {role,userId,plan} = paiement
            let reste = 0
            if(userId == req.user.id && req.role == role){
                console.log(req.user?.forfait)
                reste = Math.max((new Date(
                    req.user?.forfait?.fin
                    ?req.user?.forfait?.fin?._seconds*1000 
                    : Date.now()) - new Date()
                ),0)
            }

            await db.collection(role).doc(userId).update({
                'forfait.type': plan,
                "forfait.debut": timeStamp.now(),
                "forfait.fin": timeStamp.fromMillis(Date.now() + Jours[plan]*24*60*60*1000 +reste )
            })

            if(userId != req.user.id || req.role != role){
                await susprendreCompte(req.user.id,req.role ?? "locataire")
                return res.status(203).json({
                    success: false,
                    msg: ' votre compte a été suspendus pour 7 jours car nous avons répéré uns activité inhabituelle'
                })
            }

            console.log("ok")
            return res.status(data?.code || 400).json({
                success: true,
                data: {montant: data?.transaction?.amount,status: data?.transaction?.status},
                msg: data?.message ?? "",
                reference: data?.transaction?.merchant_reference,
                authorization_url: data?.authorization_url,
            })
        }
        else{
            await db.collection("paiement").doc(data?.transaction?.merchant_reference).update({
                statut: data?.transaction?.status
            })
            return res.status(data?.code || 400).json({
                success: true,
                data: {montant: data?.transaction?.amount,status: data?.transaction?.status},
                msg: data?.message ?? "",
                reference: data?.transaction?.merchant_reference,
                authorization_url: data?.authorization_url,
            })
        }

        
    }catch(err){
        return res.status(400).json({
            success: false,
            msg: "Paiement échoué",
            reference: req.body.reference,
        })
    }
}

module.exports = {searchStatusPaiement}