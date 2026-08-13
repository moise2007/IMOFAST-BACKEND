const { db, admin} = require("../../config/firebase")
const {Filter} = admin.firestore

const getCommentaire = async(req,res)=>{
    try{
        const { pageSize=10,lastId} = req.query
        const {col,id} = req.params
        const taille = Number(pageSize) || 10;


        let  query = db.collection("commentaire")
        query = query.where("typeCible","==",col)
        query = query.orderBy("createdAt", "desc")
        query = query.where("cibleId","==",id)
        
        const total = (await query.count().get()).data().count

        query = query.limit(taille)
        if(lastId && lastId != "null"){
            const lastCommentaire = await db.collection("commentaire")
            .where("idPublic","==",lastId)
            .limit(1)
            .get()
            if(!lastCommentaire.empty){
                query = query.startAfter(lastCommentaire.docs[0])
            }
        }
        const commentaireRef = await query.get()

        const commentaires = commentaireRef.docs.map(doc => doc.data())

        return res.status(200).json({
            success: true,
            commentaires,
            hasMore:commentaires.length == taille,
            total,
            msg : req.t("success.commentaire_get",{ns:"responses"})
        })
    }
    catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            hasMore: false,
            msg: req.t("server_error", { ns: "errors" })
        })
    }

}

module.exports = {getCommentaire}