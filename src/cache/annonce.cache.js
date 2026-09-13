const Cache = require("./cache")

class AnnonceCache extends Cache{
    constructor(name){
        super(name)
    }
}

const annonceCache = new AnnonceCache("annonces")
module.exports = {annonceCache}