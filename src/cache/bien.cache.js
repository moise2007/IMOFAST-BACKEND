const Cache = require("./cache")
class BienCache extends Cache{

}

const bienCache = new BienCache("biens")
module.exports = { bienCache }