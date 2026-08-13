

const createMetaDataAnnonce = (bailleur)=>{
    let note = 20
    if(bailleur?.forfait?.type == "mensuel"){
        note+= 20
    }
    if(bailleur?.forfait?.type == "trimestriel"){
        note+= 25
    }
    if(bailleur?.forfait?.type == "annuel"){
        note+= 30
    }
    if(bailleur?.verification?.estDigne){
        note += 30
    }
    return note
}

module.exports = {createMetaDataAnnonce}