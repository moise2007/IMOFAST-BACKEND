
class Currency{
    static lastUpdate = new Date()
    static currency = null

    static async initialize (){
        const key = process.env.API_KEY_CURRENCY
        const base = 'USD'
        const output = 'json'

        // try{
        //     const response = await fetch(`https://currencyapi.net/api/v2/rates?base=${base}&output=${output}&key=${key}`,{
        //         headers : {"Accept" : "application/json"}
        //     })
        //     const data = await response.json()
        //     if(!data.valid){
        //         return this.initialize()
        //     }
        //     this.currency = data.rates
        //     console.log("monnaie bien initialiser")
        //     return data.rates
        // }
        // catch(err){
        //     console.log("error currency : "+err)
        //     return null
        // }
        return {XAF:600, EUR: 650,EURO: 650}
    }
    
    static async autoUpdateCurrency(){
        await this.initialize()
        setInterval(async ()=>{
           await this.initialize()
        },24*60*60*1000)
    }
}

module.exports = {Currency}