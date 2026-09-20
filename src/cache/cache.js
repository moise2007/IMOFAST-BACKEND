const fs=require("fs/promises");
const path=require("path");
const {sendEmailToAlertError}=require("../services/sendMailErrorProduction.service");

function validate(id,data){
    return id!=null&&data!=null&&typeof id==="string"&&typeof data==="object"&&Object.keys(data).length>0;
}

class Cache{
    constructor(name){
        this.name=name;
        this.cache=new Map();
        this.spaceTimeLine=30*1000;
        this.pathFile=path.join(__dirname,`../../data/${name}.json`);
    }

    async init(){
        try{
            await fs.mkdir(path.dirname(this.pathFile),{recursive:true});
            try{
                const data=await fs.readFile(this.pathFile,"utf8");
                this.cache=new Map(JSON.parse(data));
                setTimeout(()=>{
                    this.autoSave()
                },this.spaceTimeLine)
            }catch{
                this.cache=new Map();
            }
        }catch(err){
            console.error(err);
            await sendEmailToAlertError({
                title:"Erreur d'initialisation du cache : "+this.name,
                error:err,
                req:null,
                statusCode:400
            });
        }
    }

    async save(){
        await fs.writeFile(this.pathFile,JSON.stringify([...this.cache.values()],null,2),"utf8");
    }

    autoSave(){
        setInterval(async()=>{
            try{
                await this.save();
            }catch(err){
                console.error("Erreur sauvegarde cache :",err);
                await sendEmailToAlertError({
                    title:"Erreur d'automatisation de l'enregistrement du cache : "+this.name,
                    error:err,
                    req:null,
                    statusCode:400
                });
            }
        },this.spaceTimeLine);
    }

    setItem({id,data}){
        if(!validate(id,data))return{success:false,data:null};
        this.cache.set(id,data);
        return{success:true,data};
    }

    getItem({id}){
        if(!id||typeof id!=="string")return{success:false,data:null};
        const exist=this.cache.has(id);
        return{success:exist,data:exist?this.cache.get(id):null};
    }

    deleteItem({id}){
        if(!id||typeof id!=="string")return{success:false};
        return{success:this.cache.delete(id)};
    }

    clear(){
        this.cache.clear();
    }
}

module.exports=Cache;