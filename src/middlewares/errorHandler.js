module.exports = (err, req, res, next) => {
  // JSON invalide envoyé par le client (erreur connue d'Express)
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "JSON invalide" });
  }

  // Erreur prévue 
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...err.extra,
    });
  }

  // Erreur imprévue 
  console.error(err);
  return res.status(500).json({
    success: false,
    message: "Erreur interne du serveur",
  });
};