const { db } = require("../../config/firebase")
const { validatorEmail } = require("../../utils/validator/validator")

const updateEmailBailleur = async(req,res)=>{
   try{
         // recuperer le password et new Email
        const {newEmail,password} = req.body
        const user = req.user

        //verifier si le nouvelle email est valid et deferent de l'ancien sinon STOP
        const isValidEmail = validatorEmail(newEmail)
        if(!isValidEmail){
            return res.status(400).json({
                success: false,
                redirect: false,
                path: null,
                msg: "les données ont été modifiés avec succèss"
            })
        }
        // si l'email n'a pas ete enregistrer pas google ou par facebook
        if(!user?.oAuth?.uidFacebook && !user?.oAuth?.uidGoogle){
            // verifier le mot de passe
            const isValidPassword = bcrypt.compare(password,user.password)
            if(!isValidPassword){
                return res.status(409).json({
                    sucess:false,
                    msg: "mot de passe invalide",
                    path:null,
                    redirect:false,
                })
            }
        }
        //rechercher l'utilisateur dans la base et changer l'email
        const userRef = db.collection("bailleur").doc(user.id)

        //verifie si la nouvelle email n'est pas dans la collection de email verifie
        const emailsVerifie = await db.collection("identifiantVerifie")
        .where("identifiant","==",newEmail).get()
        if(emailsVerifie.empty){
            return res.status(409).json({
                sucess:false,
                msg: "email n'a pas été vérifié, veuillez réessayer",
                path:null,
                redirect:false,
            })
        }

        const emailVerife = {...emailsVerifie.docs[0].data()}
        if(new Date(emailVerife?.expireAt) <  new Date()){
            return res.status(400).json({
                sucess:false,
                msg: "le delai est passé, veuillez réessayer",
                path:null,
                redirect:false,
            })
        }

        await emailsVerifie.docs[0].ref.delete()
        await userRef.update({ email: newEmail,emailVerifie: true })

   }
   catch(err){
        console.log("erreur update email : " + err)
        return res.status(500).json({
            sucess:false,
            msg: "une erreur est survenue, veuillez réessayer plustard",
            path:null,
            redirect:false,
        })
   }
}

module.exports = { updateEmailBailleur }