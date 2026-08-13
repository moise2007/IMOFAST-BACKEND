const i18next = require("i18next")
const Backend = require('i18next-fs-backend')
const middleware = require("i18next-http-middleware")
const path = require('path')

i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
        fallbackLng: 'fr',     
        supportedLngs: ['fr', 'en'],
        preload: ['fr', 'en'],
        ns: ['errors', 'responses', 'emails'],
        defaultNS: 'responses',
        backend: {
            loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
        },
        detection: {
            order: ['header', 'querystring'], 
            lookupQuerystring: 'lang',
            lookupHeader: 'accept-language',
            caches: false,
        },
    });
module.exports = i18next