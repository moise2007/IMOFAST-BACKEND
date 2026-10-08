const Cache = require("./cache")
class BienCache extends Cache{
    constructor(name){
        super(name);
        this.documentIds=new Map();
        this.itemTtlMs=5*60*1000;
    }

    async init(){
        await super.init();
        const expiresAt=Date.now()+this.itemTtlMs;
        for(const id of this.cache.keys()){
            if(!this.expirations.has(id))this.expirations.set(id,expiresAt);
        }
    }

    setBien(bien,documentId){
        if(!bien?.idPublic)return{success:false,data:null};
        if(documentId)this.documentIds.set(bien.idPublic,documentId);
        return this.setItem({id:bien.idPublic,data:bien,ttlMs:this.itemTtlMs});
    }

    setDocumentId(idPublic,documentId){
        if(idPublic&&documentId)this.documentIds.set(idPublic,documentId);
    }

    getDocumentId(idPublic){
        return this.documentIds.get(idPublic)??null;
    }

    deleteItem({id}){
        this.documentIds.delete(id);
        return super.deleteItem({id});
    }

    clear(){
        this.documentIds.clear();
        super.clear();
    }
}

const bienCache = new BienCache("biens")
module.exports = { bienCache }
