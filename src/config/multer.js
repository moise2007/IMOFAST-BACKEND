
const multer = require('multer')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') 
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}_${file.originalname}`)
    }
})
const upload = multer({storage: storage})

const TYPES_AUTORISES = {
    images: ["image/jpeg", "image/png", "image/webp"],
    videos: ["video/mp4", "video/quicktime", "video/webm"],
    audio: ["audio/webm", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"],
}

/// middleware de chargement des images et videos
const uploadMedia = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: 512*1024*1024},
    fileFilter: (req,file,cb)=>{
        const tous = [...TYPES_AUTORISES.images,...TYPES_AUTORISES.videos,...TYPES_AUTORISES.audio]
        if(tous.includes(file.mimetype)){
            cb(null,true)
        }
        else{
            cb(new Error("Type de fichier non autorisé"))
        }
    }
})
module.exports= {uploadMedia,TYPES_AUTORISES,upload}