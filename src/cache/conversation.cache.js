const Cache = require("./cache")
class ConversationCache extends Cache{

}

const conversationCache = new ConversationCache("conversation")
module.exports = {conversationCache}