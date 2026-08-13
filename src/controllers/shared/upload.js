
const { TYPES_AUTORISES } = require("../../config/multer")
const { uploadImage, uploadVideo, uploadAudio } = require("../../services/upload.service")

const DOSSIERS = {
    cni:"cni",
    imageAncienContrat: "anciens-contrats",
    photoProfil:"photos-profil",
    images:"images",
    videos:"videos",
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
const upLoadFiles = async (req,res)=>{
    try{
        if(!req.files || req.files.length === 0){
            return res.status(400).json({
                success: false,
                msg: "Aucun fichier reçu"
            })
        }
        const result ={}
        await Promise.all(
            Object.entries(req.files).map(async([nomChamp,fichiers])=>{
                const dossier = DOSSIERS[nomChamp] ?? "autres"
                result[nomChamp] = await Promise.all(
                    
                    fichiers.map(async (file)=>{
                        if(TYPES_AUTORISES.images.includes(file.mimetype)){
                            return await uploadImage(file.buffer,file.mimetype,dossier,req)
                        }
                        if(TYPES_AUTORISES.videos.includes(file.mimetype)){
                            return await uploadVideo(file.buffer,file.mimetype,dossier,req)
                        }
                        if(TYPES_AUTORISES.audio.includes(file.mimetype)){
                            return await uploadAudio(file.buffer,file.mimetype,dossier,req)
                        }
                    })
                )
            })
        )
        return res.status(200).json({
            success: true,
            msg: "Fichiers uploadés avec succès",
            data: result
        })
    }
    catch (err) {
        console.error("Erreur upload :", err)
        return res.status(500).json({
            success: false,
            msg: err.message || "Une erreur est survenue lors de l'upload"
        })
    }
}

const supprimerMedia = async (req, res) => {
    try {
        const { key } = req.body

        if (!key) {
            return res.status(400).json({
                success: false,
                msg: "Clé du fichier requise"
            })
        }

        await supprimerFichier(key)

        return res.status(200).json({
            success: true,
            msg:     "Fichier supprimé avec succès"
        })

    } catch (err) {
        console.error("Erreur suppression :", err)
        return res.status(500).json({
            success: false,
            msg: "Une erreur est survenue lors de la suppression"
        })
    }
}
module.exports = {supprimerMedia,upLoadFiles}