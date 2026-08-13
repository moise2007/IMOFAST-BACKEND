
const jwt = require("jsonwebtoken");


const generateTokenSession = (idsession)=>{
    const playload = {
        idsession
    }

    const token = jwt.sign(playload,process.env.JWT_SECRET,{
        expiresIn: "1y"
    })
    return token
}

module.exports = {generateTokenSession}