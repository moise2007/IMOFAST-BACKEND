const { S3Client } = require("@aws-sdk/client-s3")

const r2 = new S3Client({
    endpoint:    process.env.R2_ENDPOINT,
    region:      "auto",
    credentials: {
        accessKeyId:     process.env.R2_KEY_ID,
        secretAccessKey: process.env.R2_APP_KEY,
    }
})

module.exports = { r2 }