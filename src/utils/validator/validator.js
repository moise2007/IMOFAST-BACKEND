const { PassThrough } = require("nodemailer/lib/xoauth2")

/**
 * 
 * @param {String} email 
 * @returns {boolean} 
 */
const validatorEmail = (email)=>{
    const regex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
    return regex.test(email)
}

/**
 * permet de verie si le numero de telephone est valide
 * @param {String} number 
 * @param {String} country 
 */
const validatorPhoneNumber = (number,country = "cameroun")=>{
    const regexTableau = {
        "cameroun" : /^6[2456789][0-9]{7}$/,
    }
    const regex = regexTableau[country]

    return regex.test(number)

}

/**
 * 
 * @param {String} password 
 * @returns {Boolean}
 */
const validatorPassword = (password)=>{
    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W]).+$/
    return password.length >= 8 && password.length < 32 && regex.test(password) 
}
module.exports = {validatorEmail,validatorPhoneNumber,validatorPassword}