const Cache = require("./cache")

class CandidatureCache extends Cache{
    constructor(name){
        super(name)
    }
}

const candidatureCache = new CandidatureCache("candidatures")
module.exports = {candidatureCache}