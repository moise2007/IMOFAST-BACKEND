const { db } = require("../../config/firebase")

const verifieEmailBailleur = async(req,res)=>{
    const {email,code,newEmail=null} = req.body
    console.log(email,code)
    try{
        const response  = await fetch(`${process.env.BASE_URL}/api/otp/verifie-email/code/bailleur`,{
            method: "POST",
            headers:{"Content-Type": "application/json"},
            body : JSON.stringify({email, newEmail,code})
        })
        const data = await response.json()
        console.log(data)
        if(data.success){
            const userdoc = await db.collection("bailleur").where("email","==",email).get()
            if(!userdoc.empty){
                const id = userdoc.docs[0].id
                await db.collection("bailleur").doc(id).update({"emailVerifie": true,"verification.emailVerifie": true, email:newEmail ?? email})
                return res.status(200).json(data)
            }
            else{
                return res.status(400).json({
                    success: false,
                    msg: "impossible de verifié cette email car il n'est pas indentifié"
                })
            }
        }else{
            return res.status(400).json(data)
        }
    }
    catch(err){
        console.log("une erreur envoie mail : "+err)
        return res.status(500).json({
            success: false,
            msg: "une erreur s'est produite lors de la vérification de votre email, essayez plus tard"
        })
    }
}
module.exports = { verifieEmailBailleur}