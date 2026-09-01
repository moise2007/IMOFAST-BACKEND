const { OAuth2Client } = require("google-auth-library");

const CLIENT_ID = process.env.CLIENT_ID_GOOGLE_OAUTH2;
const client = new OAuth2Client(CLIENT_ID);

async function verifyGoogleToken(idToken) {
  try {
    if (!idToken) {
      return {
        success: false,
        message: "Le token Google est requis.",
      };
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: CLIENT_ID,
    });

    const userData = ticket.getPayload();

    if (!userData) {
      return {
        success: false,
        message: "Impossible de récupérer les informations Google.",
      };
    }

    return {
      success: true,
      user: {
        uidGoogle: userData.sub,
        email: userData.email || "",
        emailVerifie: userData.email_verified === true,
        nom: userData.name || "",
        prenom: userData.given_name || "",
        photoProfil: userData.picture || "",
        telephone: userData.phone_number || ""
      },
    };
  } catch (error) {
    console.error("Erreur vérification Google :", error);

    return {
      success: false,
      message: "Le token Google est invalide ou expiré.",
    };
  }
}

module.exports = { verifyGoogleToken };