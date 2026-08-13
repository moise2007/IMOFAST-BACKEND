const { db, admin } = require("../../config/firebase");
const { Users } = require("../../services/auto/usersGetting");
const {Filter} = admin.firestore



const getContact = async(req,res)=>{
    const role = req.role
    const userId = req.user.idPublic
    const {texte,page} = req.query
    const collectionSearch = role == "locataire" ? "bailleur": "locataire"

    let users = Users.COMPTE_CACHE[collectionSearch]
    users = users.filter(doc=>{
        return(
            doc.nom?.toLowerCase()?.includes(texte?.toLowerCase()) || 
            doc.prenom?.toLowerCase()?.includes(texte?.toLowerCase()) || 
            doc.email?.toLowerCase()?.includes(texte?.toLowerCase()) || 
            texte == ""
        )
    })
    

    users = users.map(
        (u,index)=>({type: collectionSearch,nom:u.nom,prenom:u.prenom,photoProfil:u.photoProfil, idPublic: u.idPublic ?? index})
    )
    
    users = users.slice(150 *(page-1),150 *page)
    return res.status(200).json({
        success: true,
        msg: "",
        users,
        isAll: users.length<150
    })
}
module.exports = {getContact}