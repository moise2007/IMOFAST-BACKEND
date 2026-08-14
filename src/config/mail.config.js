const nodemailer = require("nodemailer");
const {Resend} = require("resend")

// configuration de resend
const resend = new Resend(process.env.API_KEY_RESEND)


const CONTACT_RECIPIENT = process.env.CONTACT_RECIPIENT || "contact@imofast.org";

function getMailConfig() {
  const user = process.env.MAIL_USER?.trim();
  const pass = process.env.MAIL_PASS?.trim();
  const host = process.env.MAIL_HOST?.trim();
  const port = Number(process.env.MAIL_PORT) || 587;

  if (!user || !pass) {
    throw new Error(
      "Variables MAIL_USER et MAIL_PASS manquantes dans le fichier .env du backend"
    );
  }

  return { user, pass, host, port };
}

function createMailTransport() {
  const { user, pass, host, port } = getMailConfig();
  const rejectUnauthorized =process.env.MAIL_TLS_REJECT_UNAUTHORIZED !== "false" 

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    tls: {
      minVersion: "TLSv1.2",
      rejectUnauthorized,
    },
  });
}

async function verifyMailTransport() {
  const transport = createMailTransport();
  await transport.verify();
  return true;
}



module.exports = {
  createMailTransport,
  verifyMailTransport,
  getMailConfig,
  CONTACT_RECIPIENT,
  resend
};
