const middleware = require("i18next-http-middleware")
const i18next = require("../config/i18n.config")
module.exports = middleware.handle(i18next)