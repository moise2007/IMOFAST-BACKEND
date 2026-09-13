const Cache = require("./cache")
class MessageCache extends Cache{

}

const messageCache = new MessageCache("messagerie")
module.exports = {messageCache}