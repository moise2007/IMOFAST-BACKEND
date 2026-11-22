let io;

function setNotificationIo(server) {
  io = server;
}

function emitNotification(notification) {
  if (notification?.destinataireId) {
    io?.to(notification.destinataireId).emit("notification", notification);
  }
}

function isRecipientConnected(idPublic) {
  return Boolean(idPublic && io?.sockets?.adapter?.rooms?.get(idPublic)?.size);
}

module.exports = { setNotificationIo, emitNotification, isRecipientConnected };
