const twilio = require("twilio"); // Or, for ESM: import twilio from "twilio";

// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function createMessage() {
  const message = await client.messages.create({
    contentSid: "HXfe5ab5f00277942d4d4200328b4d403c",
    from: "whatsapp:+17372508034",
    to: "whatsapp:+237692870414",
  });

  console.log(message.sid);
}

module.exports = {createMessage}