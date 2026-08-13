const detextLang = (req,res,next)=>{
    req.lang = req.user?.lang || req.query?.lang || req.headers['accept-language']?.split(",")[0] || 'fr'
}