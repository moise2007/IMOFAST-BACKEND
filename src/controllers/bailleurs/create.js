const { verifyGoogleToken } = require("../../services/verifyIdGoogle.service")
const { db, admin } = require("../../config/firebase")
const { validatorEmail, validatorPhoneNumber, validatorPassword, validateText } = require("../../utils/validator/validator")
const {Filter} = admin.firestore
const {Bailleur} = require("../../models/bailleur")
const bcrypt = require("bcrypt")
const { CompletudeProfilBailleur } = require("../../services/notation/completudeBailleur")
const { createSession } = require("../../services/cookies/cookie.service")
// l'inscription) avec le même code.
const REPONSE_ERREUR_SERVEUR = {
    success: false,
    msg: "Une erreur est survenue, veuillez réessayer plus tard"
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res response de la requette
 * @returns {Object}
 */

const createBailleur = async(req,res)=>{
    try{
        // recuperation des donnees
        let {
            nom, email=null, prenom=null, telephone=null, password=null, photoProfil=null,typeProfil='bailleur',
            dateNaissance = null, localisation= null, idTokenGoogle, cni =null, imageAnciensContrats = null,
        } = req.body

        let user,uGoogle, emailVerifie = false, uidGoogle
    

        // verification des donnees
        if(idTokenGoogle){
            // verification du token google
            uGoogle = await verifyGoogleToken(idTokenGoogle)
            if(!uGoogle.success){
                return res.status(422).json({
                    success: false,
                    msg: "une erreur incconue s'est produite."
                })
            }

            const user = uGoogle.user
            nom = user.nom
            prenom = user.prenom
            telephone = user.telephone
            uidGoogle = user.uidGoogle
            emailVerifie = user.emailVerifie
            photoProfil = user.photoProfil
            email = user.email
            password =  null
        }

        if(password && !validatorPassword(password)){
            return res.status(422).json({
                success: false,
                msg: "le mot de passe est invalide"
            })
        }

        const nomIsvalid = validateText(nom,{min:2 , max: 1024, required: true, fieldName: "nom"})
        console.log(nomIsvalid)
        if(nomIsvalid){
            return res.status(422).json({
                success: false,
                msg: nomIsvalid
            })
        }

        if(validateText(prenom,{min:2 , max: 1024, required: false})){
            return res.status(422).json({
                success: false,
                msg: "le prénom est invalide"
            })
        }

        if(!validatorEmail(email) && email){
            return res.status(422).json({
                success: false,
                msg: "l'email est invalide"
            })
        }

        if(!validatorPhoneNumber(telephone) && telephone){
            return res.status(422).json({
                success: false,
                msg: "numéro de téléphone est invalide"
            })
        }

        // cryptage du mot de passse
        if(validatorPassword(password))
            password = await bcrypt.hash(password,process.env.SALTROUND*1);

        // veriffication de l'existence des utilisateurs avec cette identifiant

        
        const orFilters = [];

        telephone = telephone.startsWith("+237") ? telephone : `+237${telephone}`
        if (email) {
            orFilters.push(
                Filter.and(
                    Filter.where("email", "==", email),
                    Filter.or(
                        Filter.where("verification.emailVerifie", "==", true),
                        Filter.where("verification.telephoneVerifie", "==", true),
                    )
                )
            );
        }

        if (telephone) {
            orFilters.push(
                Filter.and(
                    Filter.where("telephone", "==", telephone),
                    Filter.or(
                        Filter.where("verification.emailVerifie", "==", true),
                        Filter.where("verification.telephoneVerifie", "==", true),
                    )
                )
            );
        }

        if (orFilters.length === 0) {
            throw new Error("les email invalides");
        }

        const bailleurs = await db.collection("bailleur")
            .where(orFilters.length === 1 ? orFilters[0] : Filter.or(...orFilters))
            .get();


        // verication que le tableau des utilisateur authentifier ayant les memes donnes est vide
        if(!bailleurs.empty){
            return res.status(409).json({
                redirect: false,
                path:null,
                success: false,
                msg: "cet utilisateur existe deja veuillez réessayer avec un autre identifiant"
            })
        }

        // suppression des doublons
        const usersNonAuth = await db.collection("bailleur")
        .where(
            Filter.or(
                Filter.and(
                    Filter.where("email","==",email),
                    Filter.where("verification.emailVerifie","==",false),
                    Filter.where("verification.telephoneVerifie","==",false),
                ),
                Filter.and(
                    Filter.where("telephone","==",`${telephone}`),
                    Filter.where("verification.emailVerifie","==",false),
                    Filter.where("verification.telephoneVerifie","==",false),
                )
            )
        ).get();

        if(!usersNonAuth.empty){
            const batch = db.batch()
            usersNonAuth.forEach(user=>{
                batch.delete(user.ref)
            })
            await batch.commit();
        }
            
            
            
        let completudeProfilPourcentage = CompletudeProfilBailleur({nom,emailVerifie:emailVerifie,telephoneVerifie:false,localisation
            ,cni,cniVerifie: false,imageAnciensContrats:[],photoProfil, dateNaissance
        }) ?? 45
        
        // creation du model de bailleur
        const bailleur = new Bailleur({typeProfil,
            nom,email, prenom,telephone:`+237${telephone}`,password,
            photoProfil,dateNaissance, localisation,
            uidGoogle :  uidGoogle ?? null,
            cni, imageAnciensContrats, completudeProfilPourcentage, 
            emailVerifie : emailVerifie
        })

        const bailleurFirebaseObject = bailleur.toFirebase()
            

        // enregistrement du bailleur dans la base de donness
        const userdoc = await  (await db.collection("bailleur").add(bailleurFirebaseObject)).get();

        //recuperation l'id et des donnes 
        let idUser = userdoc.id
        user = {...userdoc.data()};

        await createSession(res,idUser,"bailleur",req)

        const estVerifie = user?.verification?.emailVerifie || user?.verification?.telephoneVerifie

        if (estVerifie) {
            return res.status(200).json({
                success: true,
                msg: "Compte créé avec succèss",
                user,
            })
        }

        // envoie du code
        

        console.log("bailleur crée : "+userdoc.id)
        return res.status(200).json({
            success: true,
            msg:"utilisateur a été crée avec success",
            user,
            redirect: false,
            path:null
        })
    
    }
    catch(err){
        console.log("erreur creation bailleur : "+err)
        return res.status(500).json(REPONSE_ERREUR_SERVEUR)
    }

}

module.exports = { createBailleur }