const Cache = require("./cache");

// Données calculées de /bailleur/getData, mises en cache brièvement et invalidées lors des changements de biens.
const bailleurDataCache = new Cache("bailleur-data");

module.exports = { bailleurDataCache };
