class Regex{
    static isNumber = (value) => /^[0-9]$/.test(value)
    static isletter = (value)=> /^[a-z]$/.test(value)
}

module.exports = {Regex}