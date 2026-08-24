const { Users } = require("../../services/auto/usersGetting")


dashboard = async(req,res)=>{
  try{

    // donne sur les kpi
    const user = req.user
    const size = Users.SIZE
    const kpis ={
      locataires: size.locataire,
      bailleurs: size.bailleur,
      annonces: size.annonce,
      inscriptions: size.bailleur + size.locataire,

      locatairesTrend: "+0%",
      bailleursTrend: "+0%",
      annoncesTrend: "+0%",
      inscriptionsTrend: "+0%"
    }
    
    return res.status(200).json({
      success: true,
      user,
      comptes: [...Users.COMPTE_CACHE.bailleur,...Users.COMPTE_CACHE.locataire],
      annonces: Users.COMPTE_CACHE.annonce,
      biens: Users.COMPTE_CACHE.bien,
      kpis,
      msg: "good chargement"
    })
  }
  catch(err){
    return res.status(500).json({
      success: false
    })
  }
}

module.exports = {dashboard}