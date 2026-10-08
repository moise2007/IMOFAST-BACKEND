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
        this.expirations=new Map();
        this.inFlight=new Map();
        this.saveTimer=null;
    }

    async init(){
        try{
            await fs.mkdir(path.dirname(this.pathFile),{recursive:true});
            try{
                const data=await fs.readFile(this.pathFile,"utf8");
                const parsed=JSON.parse(data);
                this.cache=new Map();
                this.expirations=new Map();
                for(const entry of Array.isArray(parsed)?parsed:[]){
                    if(Array.isArray(entry)&&entry.length>=2&&typeof entry[0]==="string"){
                        this.cache.set(entry[0],entry[1]);
                        if(Number.isFinite(entry[2]))this.expirations.set(entry[0],entry[2]);
                    }else if(entry&&typeof entry==="object"){
                        // Migrate the old values-only cache files using each record's public id.
                        const id=entry.idPublic??entry.id;
                        if(typeof id==="string")this.cache.set(id,entry);
                    }
                }
            }catch(err){
                if(err.code!=="ENOENT")console.error(`Cache ${this.name} illisible, il sera reconstruit:`,err.message);
                this.cache=new Map();
                this.expirations=new Map();
            }
            this.autoSave();
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
        const now=Date.now();
        const entries=[...this.cache.entries()]
            .filter(([id])=>!this.expirations.has(id)||this.expirations.get(id)>now)
            .map(([id,data])=>[id,data,this.expirations.get(id)??null]);
        await fs.writeFile(this.pathFile,JSON.stringify(entries,null,2),"utf8");
    }

    autoSave(){
        if(this.saveTimer)return this.saveTimer;
        this.saveTimer=setInterval(async()=>{
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
        this.saveTimer.unref?.();
        return this.saveTimer;
    }

    setItem(input,dataArgument,options={}){
        const {id,data,ttlMs}=typeof input==="object"&&input!==null
            ? input
            : {id:input,data:dataArgument,...options};
        if(!validate(id,data))return{success:false,data:null};
        this.cache.set(id,data);
        if(Number.isFinite(ttlMs)&&ttlMs>0)this.expirations.set(id,Date.now()+ttlMs);
        else this.expirations.delete(id);
        return{success:true,data};
    }

    getItem({id}){
        if(!id||typeof id!=="string")return{success:false,data:null};
        const expiresAt=this.expirations.get(id);
        if(expiresAt&&expiresAt<=Date.now()){
            this.cache.delete(id);
            this.expirations.delete(id);
            return{success:false,data:null};
        }
        const exist=this.cache.has(id);
        return{success:exist,data:exist?this.cache.get(id):null};
    }

    async getOrLoad({id,loader,ttlMs}){
        const cached=this.getItem({id});
        if(cached.success)return cached;
        if(this.inFlight.has(id))return this.inFlight.get(id);
        const pending=(async()=>{
            const data=await loader();
            if(data!==undefined&&data!==null){
                this.setItem({id,data,ttlMs});
                return{success:true,data};
            }
            return{success:false,data:null};
        })().finally(()=>this.inFlight.delete(id));
        this.inFlight.set(id,pending);
        return pending;
    }

    deleteItem({id}){
        if(!id||typeof id!=="string")return{success:false};
        this.expirations.delete(id);
        return{success:this.cache.delete(id)};
    }

    deleteWhere(predicate){
        let deleted=0;
        for(const [id,data] of this.cache){
            if(predicate(data,id)){
                this.cache.delete(id);
                this.expirations.delete(id);
                deleted++;
            }
        }
        return deleted;
    }

    clear(){
        this.cache.clear();
        this.expirations.clear();
    }
}

module.exports=Cache;
