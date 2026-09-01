// config/webpush.js

const webpush = require("web-push");

webpush.setVapidDetails(
  "mailto:contact@imofast.org",
  process.env.PUBLIC_KEY_NOTIF,
  process.env.PRIVATE_KEY_NOTIF
);

module.exports ={ webpush };