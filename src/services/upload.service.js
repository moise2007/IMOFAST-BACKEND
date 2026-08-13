const crypto = require("crypto")
const sharp = require("sharp")
const { Upload }       = require("@aws-sdk/lib-storage")
const { DeleteObjectCommand, Bucket$ } = require("@aws-sdk/client-s3")
const { r2 } = require("../config/r2")

const BUCKET = process.env.R2_BUCKET

// generation d'image
const genererNom = (dossier,extension)=>{
    const id = crypto.randomBytes(16).toString("hex")
    return `${dossier}/${id}.${extension}`
}

// upload image
const uploadImage = async(buffer,mimetype,dossier="images",req)=>{
 
    const doc = `${dossier}/${req.role}/${req.user.idPublic}`
    const extension = mimetype === "image/png" ? "png": "webp"
    const imageOptimisee = await sharp(buffer)
    .resize(1280,1280,{fit: 'inside',withoutEnlargement: true})
    .toFormat(extension, {quality: 10})
    .toBuffer()

    const key = genererNom(doc,extension)
    const upload = new Upload({
        client: r2,
        params:{
            Bucket: BUCKET,
            Key: key,
            Body: imageOptimisee,
            ContentType: `image/${extension}`
        }
    })
    await upload.done()
    return {
        type:"image",
        url: `${process.env.R2_CDN_URL}/${key}`,
    }
}

// upload de video
const uploadVideo = async (buffer,mimetype,dossier = "videos",req)=>{
    const extensions = {
        "video/mp4" : "mp4",
        "video/quicktime": "mov",
        "video/webm": "webm",
    }
    const extension = extensions[mimetype] ?? "mp4"
    const doc = `${dossier}/${req.role}/${req.user.idPublic}`
    const key = genererNom(doc,extension)

    const upload = new Upload({
        client: r2,
        params : {
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimetype
        }
    })

    await upload.done()
    return {
        url: `${process.env.R2_CDN_URL}/${key}`,
        type: "video",
        
    }
}

// upload de video
const uploadAudio= async (buffer,mimetype,dossier = "audios",req)=>{
    const extensions = {
        "audio/webm": "webm",
        "audio/mpeg": "mpeg", 
        "audio/mp4": "mp4", 
        "audio/ogg": "ogg", 
        "audio/wav": "wav"
    }
    const extension = extensions[mimetype] ?? "mp4"
    const doc = `${dossier}/${req.role}/${req.user.idPublic}`
    const key = genererNom(doc,extension)

    const upload = new Upload({
        client: r2,
        params : {
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimetype
        }
    })

    await upload.done()
    return {
        url: `${process.env.R2_CDN_URL}/${key}`,
        type: "audio",
        
    }
}

const supprimerFicher = async (key)=>{
    await b2.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key
    }))
}

module.exports = {uploadImage,uploadVideo,supprimerFicher,uploadAudio}