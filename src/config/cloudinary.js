const cloudinary = require("cloudinary").v2

cloudinary.config({
    
    cloud_name: "djmc8paxu",
    api_key:process.env.PUBLIC_KEY_CLOUDINARY,
    api_secret: process.env.PRIVATE_KEY_CLOUDINARY
})
module.exports={cloudinary}