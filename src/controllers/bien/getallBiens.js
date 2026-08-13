const { db, admin } = require("../../config/firebase")

const getAllBien = async(req,res)=>{
    try{
        let {bailleurId,nature,type,ville,quartier,
            niveau,nombreChambre,nombreSalleBain,
            superficie,camera,barriere,wifi,televiseur, parking,
            piscine,ascenseur,refrigerateur,cuisine,etageMax,hopital,
            ecole, marche, mode
        } = req.query

        if(req.role == "bailleur"){
            bailleurId = req.user.idPublic
        }

        let query = db.collection("bien")

        // ── Identification ────────────────────────────────
        if (bailleurId) query = query.where("bailleurId",       "==", bailleurId)
        if (nature)     query = query.where("nature",           "==", nature)
        if (type)       query = query.where("type",             "==", type)
        if (mode)       query = query.where("mode",             "==", mode)
        if (niveau)     query = query.where("niveauFinition",   "==", niveau)

        // ── Localisation ──────────────────────────────────
        if (ville)      query = query.where("localisation.ville",   "==", ville)
        if (quartier)   query = query.where("localisation.quatier", "==", quartier)

        // ── Caractéristiques physiques ────────────────────
        if (nombreChambre)    query = query.where("chambres.nombre",   "==", parseInt(nombreChambre))
        if (nombreSalleBain)  query = query.where("salleBains.nombre", "==", parseInt(nombreSalleBain))
        if (superficie)       query = query.where("superficie",        ">=", parseInt(superficie))
        if (etageMax)         query = query.where("etage.max",         "<=", parseInt(etageMax))

        // ── Equipements ───────────────────────────────────
        if (wifi)         query = query.where("equipements.wifi",          "==", true)
        if (televiseur)   query = query.where("equipements.televiseur",    "==", true)
        if (parking)      query = query.where("equipements.parking",       "==", true)
        if (piscine)      query = query.where("equipements.piscine",       "==", true)
        if (ascenseur)    query = query.where("equipements.ascenseur",     "==", true)
        if (refrigerateur) query = query.where("equipements.refrigerateur","==", true)
        if (cuisine)      query = query.where("equipements.cuisineEquipee","==", true)

        // ── Sécurité ──────────────────────────────────────
        if (camera)   query = query.where("securite.camera",   "==", true)
        if (barriere) query = query.where("securite.barriere", "==", true)

        // ── Environnement ─────────────────────────────────
        if (hopital)  query = query.where("environements.hopital", "==", true)
        if (ecole)    query = query.where("environements.ecole",   "==", true)
        if (marche)   query = query.where("environements.marche",  "==", true)

        // ── Tri ───────────────────────────────────────────
        query = query.orderBy("createdAt", "desc")

        const snapshot = await query.get()
        const biens = snapshot.docs.map(bienRef => bienRef.data())

        if(biens?.length == 0){
            return res.status(200).json({
            success: true,
            totlal : biens.length,
            msg: req.t("success.get_all_bien",{ns: "responses"}),
            biens ,
            stats: {nombreBiens: "0",nombreBiensEnMaintenance: "0",nombreBiensOccupes: "0",nombreBiensVacants: "0",pourcentageBiensVancant: "0",pourcentageOccupationBiens: "0"}
        })
        }
            const nombreBiens = biens.reduce((somme,property)=>{
                    return (
                        somme+ parseInt(property.exemplaires?.occuper)
                        + parseInt(property.exemplaires?.disponible)
                        +parseInt(property.exemplaires?.construction)
                    );
                },0
            )
            const nombreBiensOccupes = biens.reduce((somme,property)=>somme+ parseInt(property.exemplaires?.occuper),0)
            const nombreBiensVacants = biens.reduce((somme,property)=>somme+ parseInt(property.exemplaires?.disponible),0)
            const nombreBiensEnMaintenance  = biens.reduce((somme,property)=>somme+ parseInt(property.exemplaires?.construction),0)
            const pourcentageBiensVancant = (nombreBiensVacants*100 / nombreBiens).toFixed(2);
            const pourcentageOccupationBiens = (nombreBiensOccupes*100 / nombreBiens).toFixed(2);
    

        return res.status(200).json({
            success: true,
            totlal : biens.length ,
            msg: req.t("success.get_all_bien",{ns: "responses"}),
            biens ,
            stats: {nombreBiens,nombreBiensEnMaintenance,nombreBiensOccupes,nombreBiensVacants,pourcentageBiensVancant,pourcentageOccupationBiens}
        })

    }
    catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: req.t("server_error",{ns: "errors"})
        })
    }
}
module.exports = {getAllBien}