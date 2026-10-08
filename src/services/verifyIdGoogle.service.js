// const { OAuth2Client } = require("google-auth-library");

const { auth } = require("../config/firebase");

// const CLIENT_ID = process.env.CLIENT_ID_GOOGLE_OAUTH2;
// const client = new OAuth2Client(CLIENT_ID);

// async function verifyGoogleTokenAuth(idToken) {
//   try {
//     if (!idToken) {
//       return {
//         success: false,
//         message: "Le token Google est requis.",
//       };
//     }

//     const ticket = await client.verifyIdToken({
//       idToken,
//       audience: CLIENT_ID,
//     });

//     const userData = ticket.getPayload();

//     if (!userData) {
//       return {
//         success: false,
//         message: "Impossible de récupérer les informations Google.",
//       };
//     }

//     return {
//       success: true,
//       user: {
//         uidGoogle: userData.sub,
//         email: userData.email || "",
//         emailVerifie: userData.email_verified === true,
//         nom: userData.name || "",
//         prenom: userData.given_name || "",
//         photoProfil: userData.picture || "",
//         telephone: userData.phone_number || ""
//       },
//     };
//   } catch (error) {
//     console.error("Erreur vérification Google :", error);

//     return {
//       success: false,
//       message: "Le token Google est invalide ou expiré.",
//     };
//   }
// }


async function verifyGoogleTokenAuth(idToken) {
  try {
    if (!idToken) {
      return {
        success: false,
        message: "Le token Firebase est requis"
      };
    }

    const decodedToken= await auth.verifyIdToken(idToken)
    
    if (!decodedToken) {
      return {
        success: false,
        message: "Impossible de récupérer les informations Google.",
      };
    }

    const userRecord = await auth.getUser(decodedToken.uid);

    console.log({
        uidGoogle: decodedToken.uid,
        email: decodedToken.email || null,
        emailVerifie: decodedToken.email_verified === true,
        nom: userRecord.displayName.split(" ").length > 1 ? userRecord.displayName.split(" ")[1] : null || null,
        prenom: userRecord.displayName.split(" ")[0] || null,
        photoProfil: decodedToken.picture || null,
        telephone: decodedToken.phone_number || null
      })
    return {
      success: true,
      user: {
        uidGoogle: decodedToken.uid,
        email: decodedToken.email || null,
        emailVerifie: decodedToken.email_verified === true,
        nom: userRecord.displayName.split(" ").length > 1 ? userRecord.displayName.split(" ")[1] : null || null,
        prenom: userRecord.displayName.split(" ")[0] || null,
        photoProfil: decodedToken.picture || null,
        telephone: decodedToken.phone_number || null
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

module.exports = { verifyGoogleTokenAuth };