const Cache = require("./cache")

class StatsBienBailleurCache extends Cache{
    constructor(name){
        super(name)
    }
}

const statsBienBailleurCache = new StatsBienBailleurCache("statsBiensBailleurs")
module.exports = {statsBienBailleurCache}