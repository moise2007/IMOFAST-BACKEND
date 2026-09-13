const {Resend} = require("resend")

// configuration de resend
const resend = new Resend(process.env.API_KEY_RESEND)

module.exports = { resend };
