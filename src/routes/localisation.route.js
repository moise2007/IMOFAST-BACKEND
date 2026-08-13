const express = require('express')

const RouterLocation = express.Router()

RouterLocation.post("/research",async(req,res)=>{
    try{
        const {value} = req.body

        if(value.length < 3) {
            return res.status(200).json({
                success: true,
                data: []
            })
        }
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${value}&limit=20&apiKey=${process.env.GEO_KEY}`
        const response = await fetch(url)
        if(!response.ok){
            return res.status(400).json({
                success: false,
                data: []
            })
        }
        const data = await response.json()

        return res.status(200).json({
            success: true,
            data
        })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            data: []
        })
    }
})

module.exports = {RouterLocation}