const { auth } = require("../config/firebase");
const {OAuth2Client} =require("google-auth-library")
const CLIENT_ID=process.env.CLIENT_ID_GOOGLE_OAUTH2
const client = new OAuth2Client(CLIENT_ID)

/**
 * @typedef {Object} userData
 * @property {String} nom
 * @property {Boolean} emailVerifie
 * @property {String} email
 * @property {String} photo de profil
 * @property {String} phoneNumber
 * @property {String} uidGoogle
 */

/**
 * permet de verifier si l'utilisateur existe et de retourner l'objet ou null
 * @param {String} idToken 
 * @returns {userData} l'object des donnees de l'utilisateur
 */


async function verifyGoogleToken(idToken) {
  try {
    //recuperation du code
    const ticket = await client.verifyIdToken({idToken,audience :  CLIENT_ID})
    const userData = ticket.getPayload()
    if(userData){
      const user = {
        uidGoogle : userData.sub,
        email : userData.email || "",
        emailVerifie : true,
      }
      return user;
    }else{
      throw new Error("erreur de veririfation")
    }
     
  } catch (error) {
    console.log({error})
    return null;
  }
}
module.exports = { verifyGoogleToken }