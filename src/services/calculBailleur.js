const { db } = require("../config/firebase")

/**
 * 
 * @param {Object} bailleur 
 */
async function  CalculBailleur(bailleur){
    // calcul du nombre de bien 

    // faire une requette pour recuperer les annonce du bailleur
    try{
        var bienDocs = await db.collection("bien").where("bailleurId","==",bailleur.idPublic).get()
    }catch(err){
        console.log(err)
        return {success: false}
    }
    bailleur.biens =  bienDocs.docs.map(doc => doc.data())
    bailleur.nombreBiens = bailleur.biens.length

    //trier les biens ajouter de mois
    const biensAJoutesCemois = bailleur.biens.filter(bien=> bien)
    bailleur.nombreBiensAjoutesCemois = biensAJoutesCemois.length

    //calcul du nombre de locataire
    //faire une requette pour recuperer les locataires de ce bailleurs
    bailleur.locataires = []
    bailleur.nombresLocataires = Math.min(bailleur.biens.length,bailleur.locataires.length)

    // faire un trier des locataires obtenus ce mois
    const locataireMois = []
    
    // faire un trie des biens Occupes
    bailleur.biensOccupes = bailleur.biens.filter(bien=> {
        return bien.etat == "occuper"
    }) ?? []

    bailleur.biensVacants =  bailleur.biens.filter(bien=> {
        return bien.etat == "disponible"
    }) ?? []

    bailleur.biensEnMaintenance = bailleur.biens.filter(bien=> {
        return bien.etat == "construction"
    }) ?? []

    bailleur.nombreBiensEnMaintenance = bailleur.biensEnMaintenance?.length ?? 0
    bailleur.nombreBiensVacants  = bailleur.biensVacants?.length ?? 0
    bailleur.nombreBiensOccupes = bailleur.biensOccupes?.length ?? 0
    bailleur.pourcentageOccupationBiens = (bailleur.nombreBiensOccupes/Math.max(1,bailleur.nombreBiens)*100).toFixed(1)
    bailleur.pourcentageBiensVancant = (bailleur.nombreBiensVacants/Math.max(1,bailleur.nombreBiens)*100).toFixed(1)

    //calcul sur les locataires
    bailleur.nombresLocatairesAjouterMois = Math.min(bailleur.nombresLocataires,Math.max(bailleur.biensOccupes.length,locataireMois.length)) ?? 0


    // calcul du taux d'occupation
    bailleur.tauxAugmentation = 
    // calcul du taux d'occupation du mois
    bailleur.tauxOccupationMoisCourant = bailleur.nombresLocataires*100/ Math.max(1,bailleur.nombreBiens)
    bailleur.tauxAugmentationTauxOccupation = (bailleur.nombresLocatairesAjouterMois)/ Math.max(1,bailleur.nombreBiens)
    //tableau du taux occupation de chaque mois
    //preremplir ses Biens

    //preremplir les message (faire une requette)
    bailleur.messages = []

    //preremplir les messages non lu
    bailleur.messagesNonLu = []


    // preremplir les demandes recente
    bailleur.demandes = []

    // faire un trie des demandes
    bailleur.demandeNonVu = []

    return {success: true, bailleur}
}
module.exports = {CalculBailleur}