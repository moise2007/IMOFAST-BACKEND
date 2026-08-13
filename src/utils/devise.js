const { Currency } = require("../services/auto/monnaie.auto")

const convertirEnFCFA = (val,deviseInit)=>{
    return 1
    const value = Number(val)
    if(typeof value != "number"){
        return null
    }
    let multiplicateur = 1
    const unite = Currency.currency.XAF
    if(deviseInit == "FCFA" || deviseInit == "XAF"){
        multiplicateur = 1
    }
    else{
        multiplicateur = Currency.currency[deviseInit]*unite
    }
    return Math.abs(Number(value)*multiplicateur)

}

module.exports = {convertirEnFCFA}