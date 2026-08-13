const { auth } = require("../config/firebase");


const verifyFacebookToken = async (token) => {
    try {
    //recuperation du code
    const userData = await auth.verifyIdToken(token);
    if(userId){
      const user = {
        uidFacebook : userData?.uid,
        telephone : userData?.phone_number || "",
        email : userData?.email || "",
        photoProfil : userData?.picture,
        emailVerifie : true,
        
      }
      return user;
    }else{
      throw new Error("erreur de veririfation")
    }
     
  } catch (error) {
    return null;
  }
}

module.exports = { verifyFacebookToken }