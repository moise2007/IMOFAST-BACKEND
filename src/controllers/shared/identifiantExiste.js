const { db, admin } = require("../../config/firebase")
const {Filter} = admin.firestore

const identifiantExiste = async(req, res) => {
    try{
        const { identifiant} = req.body
        const role = req.params.role
        const Users = await db.collection(role).where(
            Filter.or(
                Filter.and(
                    Filter.where("email","==",identifiant),
                    Filter.or(
                        Filter.where("verification.emailVerifie","==",true),
                        Filter.where("verification.telephoneVerifie","==",true),
                    )
                ),
            Filter.and(
                    Filter.where("telephone","==",identifiant),
                    Filter.or(
                        Filter.where("verification.emailVerifie","==",true),
                        Filter.where("verification.telephoneVerifie","==",true),
                    )
                ),
            )
        ).get()
        if(Users.empty){
            return res.status(200).json({
                success:true,
                valid: true,
            })
        }
        else{
            return res.status(201).json({
                success: true,
                valid: false
            })
        }
    }
    catch(err){
        console.log("errur verifie Existing Identifiant : "+err)
        return res.status(500).json({
            succes: false
        })
    }

}

module.exports = { identifiantExiste }