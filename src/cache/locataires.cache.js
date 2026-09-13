const Cache = require("./cache")
class LocatairesCache extends Cache{

}

const locatairesCache = new LocatairesCache("Locataires")
module.exports = {locatairesCache}